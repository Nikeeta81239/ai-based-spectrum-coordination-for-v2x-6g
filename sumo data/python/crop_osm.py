import xml.etree.ElementTree as ET
import os

WEST  = 77.600
SOUTH = 12.900
EAST  = 77.680
NORTH = 12.970

INPUT  = r"osm\bangalore_full.osm.xml"
OUTPUT = r"osm\silkboard.osm.xml"

print(f"Reading {INPUT} ...")
tree = ET.parse(INPUT)
root = tree.getroot()

inside_nodes = set()
for node in root.iter("node"):
    lat = float(node.get("lat", 0))
    lon = float(node.get("lon", 0))
    if SOUTH <= lat <= NORTH and WEST <= lon <= EAST:
        inside_nodes.add(node.get("id"))

print(f"  Nodes inside bbox: {len(inside_nodes)}")

inside_ways = set()
for way in root.iter("way"):
    for nd in way.findall("nd"):
        if nd.get("ref") in inside_nodes:
            inside_ways.add(way.get("id"))
            for nd2 in way.findall("nd"):
                inside_nodes.add(nd2.get("ref"))
            break

print(f"  Ways inside bbox : {len(inside_ways)}")

inside_relations = set()
for rel in root.iter("relation"):
    for member in rel.findall("member"):
        if member.get("type") == "way" and member.get("ref") in inside_ways:
            inside_relations.add(rel.get("id"))
            break

print(f"  Relations        : {len(inside_relations)}")

new_root = ET.Element("osm", attrib=root.attrib)
ET.SubElement(new_root, "bounds",
    minlat=str(SOUTH), minlon=str(WEST),
    maxlat=str(NORTH), maxlon=str(EAST))

kept_nodes = kept_ways = kept_rels = 0
for child in root:
    tag = child.tag
    cid  = child.get("id", "")
    if tag == "node" and cid in inside_nodes:
        new_root.append(child)
        kept_nodes += 1
    elif tag == "way" and cid in inside_ways:
        new_root.append(child)
        kept_ways += 1
    elif tag == "relation" and cid in inside_relations:
        new_root.append(child)
        kept_rels += 1

print(f"\nKept: {kept_nodes} nodes, {kept_ways} ways, {kept_rels} relations")
new_tree = ET.ElementTree(new_root)
new_tree.write(OUTPUT, encoding="utf-8", xml_declaration=True)
print(f"Done! File size: {os.path.getsize(OUTPUT)/1024/1024:.2f} MB")
