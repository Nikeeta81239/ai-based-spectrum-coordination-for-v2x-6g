import os
import xml.etree.ElementTree as ET

NET_FILE = os.path.join("network", "network.net.xml")

context = ET.iterparse(NET_FILE, events=("start", "end"))
found_params = 0
found_types = set()
location_info = None

for event, elem in context:
    if event == "end":
        if elem.tag == "location":
            location_info = elem.attrib
        elif elem.tag == "edge" and not elem.get("id", "").startswith(":"):
            for child in elem:
                if child.tag == "param":
                    found_params += 1
            if elem.get("type"):
                found_types.add(elem.get("type"))
            if found_params > 5:
                break
        elem.clear()

print("Location info:", location_info)
print(f"Params in edges: {found_params}")
print(f"Sample edge types: {list(found_types)[:10]}")
