import os
import xml.etree.ElementTree as ET

NET_FILE = os.path.join("network", "network.net.xml")

def find_corridor_edges():
    if not os.path.exists(NET_FILE):
        print(f"Error: {NET_FILE} does not exist.")
        return

    print(f"Parsing {NET_FILE} for corridor edges...")
    context = ET.iterparse(NET_FILE, events=("start", "end"))
    corridor_keywords = ["silk board", "agara", "iblur", "bellandur", "marathahalli", "outer ring road", "sarjapur", "hosur"]
    
    matches = {kw: [] for kw in corridor_keywords}
    all_edges = []

    for event, elem in context:
        if event == "end" and elem.tag == "edge":
            edge_id = elem.get("id", "")
            name = elem.get("name", "").lower()
            # Ignore internal edges starting with ':'
            if not edge_id.startswith(":"):
                all_edges.append(edge_id)
                for kw in corridor_keywords:
                    if kw in name:
                        matches[kw].append((edge_id, elem.get("name", "")))
            elem.clear()

    print(f"Total non-internal edges found: {len(all_edges)}")
    for kw, edgelist in matches.items():
        print(f"Keyword '{kw}': {len(edgelist)} matching edges.")
        if edgelist:
            sample = edgelist[:3]
            for eid, ename in sample:
                print(f"   -> Edge ID: {eid} | Name: {ename}")

    # Output a summary of discovered edges for routing
    out_file = os.path.join("python", "corridor_edges.txt")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write("# Discovered corridor edges for Silk Board -> Agara -> Iblur -> Bellandur -> Marathahalli\n")
        for kw, edgelist in matches.items():
            f.write(f"\n# Category: {kw}\n")
            for eid, ename in edgelist:
                f.write(f"{eid}  # {ename}\n")
    print(f"Saved matching edges to {out_file}")

if __name__ == "__main__":
    find_corridor_edges()
