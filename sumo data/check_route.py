import os
import sys

tools = os.path.join(os.environ["SUMO_HOME"], "tools")
sys.path.append(tools)

import sumolib

net = sumolib.net.readNet("osm.net.xml")

start = net.getEdge("1073384217#1")
middle = net.getEdge("25187665#1")
end = net.getEdge("376978813")

print("Start :", start.getID())
print("Middle:", middle.getID())
print("End   :", end.getID())
