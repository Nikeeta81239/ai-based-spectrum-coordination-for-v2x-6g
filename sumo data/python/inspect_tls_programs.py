"""
inspect_tls_programs.py  —  Extract exact TLS program details from network.net.xml
for the 5 corridor junctions so we can write correct override state strings.
"""
import os
import xml.etree.ElementTree as ET

NET_FILE = os.path.join("network", "network.net.xml")

TARGET_IDS = {
    "cluster_10282769895_10775075568_11964440742_11964440743",
    "cluster_12067305554_6017833806_6017833807_6131076159",
    "2387385680",
    "cluster_11962404444_1827247442_1827247449_5774292417_#3more",
    "cluster_1454651919_3776848084",
}

print(f"Scanning {NET_FILE} for TLS programs ...")
results = {}

context = ET.iterparse(NET_FILE, events=("start", "end"))
current_tl = None

for event, elem in context:
    if event == "start" and elem.tag == "tlLogic":
        tl_id = elem.attrib.get("id", "")
        if tl_id in TARGET_IDS:
            current_tl = {
                "id":        tl_id,
                "type":      elem.attrib.get("type", ""),
                "programID": elem.attrib.get("programID", ""),
                "offset":    elem.attrib.get("offset", "0"),
                "phases":    [],
            }
        else:
            current_tl = None

    elif event == "start" and elem.tag == "phase" and current_tl is not None:
        current_tl["phases"].append({
            "duration": elem.attrib.get("duration", "?"),
            "state":    elem.attrib.get("state", ""),
        })

    elif event == "end" and elem.tag == "tlLogic" and current_tl is not None:
        results[current_tl["id"]] = current_tl
        current_tl = None
        elem.clear()
    else:
        if event == "end":
            elem.clear()

for tl_id, prog in results.items():
    print(f"\nTLS: {tl_id}")
    print(f"  programID={prog['programID']}  type={prog['type']}  offset={prog['offset']}")
    for i, ph in enumerate(prog["phases"]):
        st = ph["state"]
        print(f"  Phase {i}: dur={ph['duration']:>4}s  len={len(st)}  state={st}")

if not results:
    print("\nNone of the target TLS IDs found in tlLogic sections.")
    print("They may be defined differently. Searching for any tlLogic ...")
    context2 = ET.iterparse(NET_FILE, events=("start",))
    count = 0
    for event, elem in context2:
        if elem.tag == "tlLogic":
            print(f"  tlLogic id={elem.attrib.get('id','?')} prog={elem.attrib.get('programID','?')}")
            count += 1
            if count >= 10:
                break
