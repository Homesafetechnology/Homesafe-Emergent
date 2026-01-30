import requests
import sys
import json
from datetime import datetime

class AlarmSystemAPITester:
    def __init__(self, base_url="https://safe-house.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_zones = []
        self.created_sensors = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_system_state(self):
        """Test system state endpoints"""
        print("\n=== Testing System State ===")
        
        # Get initial state
        success, state = self.run_test("Get System State", "GET", "system/state", 200)
        if not success:
            return False
        
        # Test state changes
        for mode in ["armed", "disarmed", "monitoring"]:
            success, _ = self.run_test(f"Set System to {mode}", "PUT", "system/state", 200, {"mode": mode})
            if not success:
                return False
        
        return True

    def test_zones_crud(self):
        """Test zones CRUD operations"""
        print("\n=== Testing Zones CRUD ===")
        
        # Get initial zones
        success, zones = self.run_test("Get Zones", "GET", "zones", 200)
        if not success:
            return False
        
        # Create a zone
        zone_data = {
            "name": "Test Living Room",
            "description": "Test zone for living room",
            "image_url": "https://images.unsplash.com/photo-1597665863042-47e00964d899?w=400"
        }
        success, zone = self.run_test("Create Zone", "POST", "zones", 200, zone_data)
        if not success:
            return False
        
        zone_id = zone.get('id')
        if zone_id:
            self.created_zones.append(zone_id)
        
        # Update the zone
        update_data = {"name": "Updated Living Room", "description": "Updated description"}
        success, _ = self.run_test("Update Zone", "PUT", f"zones/{zone_id}", 200, update_data)
        if not success:
            return False
        
        # Get zones again to verify
        success, _ = self.run_test("Get Zones After Update", "GET", "zones", 200)
        if not success:
            return False
        
        return True

    def test_sensors_crud(self):
        """Test sensors CRUD operations"""
        print("\n=== Testing Sensors CRUD ===")
        
        if not self.created_zones:
            print("❌ No zones available for sensor testing")
            return False
        
        zone_id = self.created_zones[0]
        
        # Get initial sensors
        success, sensors = self.run_test("Get Sensors", "GET", "sensors", 200)
        if not success:
            return False
        
        # Create sensors of different types
        sensor_types = ["motion", "door", "window"]
        for sensor_type in sensor_types:
            sensor_data = {
                "name": f"Test {sensor_type.title()} Sensor",
                "type": sensor_type,
                "zone_id": zone_id,
                "battery_level": 95
            }
            success, sensor = self.run_test(f"Create {sensor_type} Sensor", "POST", "sensors", 200, sensor_data)
            if not success:
                return False
            
            sensor_id = sensor.get('id')
            if sensor_id:
                self.created_sensors.append(sensor_id)
        
        # Update a sensor
        if self.created_sensors:
            sensor_id = self.created_sensors[0]
            update_data = {"name": "Updated Motion Sensor", "battery_level": 80}
            success, _ = self.run_test("Update Sensor", "PUT", f"sensors/{sensor_id}", 200, update_data)
            if not success:
                return False
        
        # Get sensors by zone
        success, _ = self.run_test("Get Sensors by Zone", "GET", f"sensors/zone/{zone_id}", 200)
        if not success:
            return False
        
        return True

    def test_sensor_triggering(self):
        """Test sensor triggering simulation"""
        print("\n=== Testing Sensor Triggering ===")
        
        if not self.created_sensors:
            print("❌ No sensors available for triggering test")
            return False
        
        sensor_id = self.created_sensors[0]
        
        # Test triggering in different system states
        states = ["disarmed", "monitoring", "armed"]
        for state in states:
            # Set system state
            success, _ = self.run_test(f"Set System to {state}", "PUT", "system/state", 200, {"mode": state})
            if not success:
                continue
            
            # Trigger sensor
            success, response = self.run_test(f"Trigger Sensor ({state})", "POST", "sensors/trigger", 200, {"sensor_id": sensor_id})
            if success:
                print(f"   Alert: {response.get('alert', False)}, Message: {response.get('message', 'N/A')}")
        
        # Reset sensor
        success, _ = self.run_test("Reset Sensor", "POST", f"sensors/{sensor_id}/reset", 200)
        return success

    def test_events_activity_log(self):
        """Test events/activity log endpoints"""
        print("\n=== Testing Activity Log ===")
        
        # Get events
        success, events = self.run_test("Get Events", "GET", "events", 200)
        if not success:
            return False
        
        print(f"   Found {len(events)} events")
        
        # Get events with limit
        success, _ = self.run_test("Get Events with Limit", "GET", "events", 200, params={"limit": 10})
        return success

    def test_settings(self):
        """Test settings endpoints"""
        print("\n=== Testing Settings ===")
        
        # Get settings
        success, settings = self.run_test("Get Settings", "GET", "settings", 200)
        if not success:
            return False
        
        # Update settings
        update_data = {
            "sms_enabled": True,
            "alert_phone_number": "+1234567890"
        }
        success, _ = self.run_test("Update Settings", "PUT", "settings", 200, update_data)
        if not success:
            return False
        
        # Get settings again to verify
        success, updated_settings = self.run_test("Get Updated Settings", "GET", "settings", 200)
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        print("\n=== Testing Dashboard Stats ===")
        
        success, stats = self.run_test("Get Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            print(f"   System Mode: {stats.get('system_mode')}")
            print(f"   Zones: {stats.get('zones_count')}")
            print(f"   Sensors: {stats.get('sensors_count')}")
            print(f"   Triggered: {stats.get('triggered_count')}")
        
        return success

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== Cleanup ===")
        
        # Delete created sensors
        for sensor_id in self.created_sensors:
            self.run_test(f"Delete Sensor {sensor_id}", "DELETE", f"sensors/{sensor_id}", 200)
        
        # Delete created zones
        for zone_id in self.created_zones:
            self.run_test(f"Delete Zone {zone_id}", "DELETE", f"zones/{zone_id}", 200)

def main():
    print("🏠 Home Intruder Alarm System - Backend API Testing")
    print("=" * 60)
    
    tester = AlarmSystemAPITester()
    
    try:
        # Run all tests
        tests = [
            tester.test_root_endpoint,
            tester.test_system_state,
            tester.test_zones_crud,
            tester.test_sensors_crud,
            tester.test_sensor_triggering,
            tester.test_events_activity_log,
            tester.test_settings,
            tester.test_dashboard_stats
        ]
        
        for test in tests:
            if not test():
                print(f"\n❌ Test {test.__name__} failed, continuing with other tests...")
        
        # Cleanup
        tester.cleanup()
        
        # Print results
        print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        return 0 if success_rate >= 80 else 1
        
    except Exception as e:
        print(f"\n💥 Test suite failed with error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())