import requests
import curses

#just setting up using localhost and port 3000
# see config.py for more info
server_ip = 'http://0.0.0.0:3000/'

# headers = {'Content-Type': 'application/json'}
# event_data = {'data_1': 481, 'data_2': -1, 'data_3': 47}
# server_return = requests.post(server_ip, json=event_data)
# print server_return.headers


direction = "east"
click_on = False

while True:
	var = raw_input("Please select a direction/switch on or off\n")



	if var == "w":
		direction = "north"
	elif var == "d":
		direction = "east"
	elif var == "s":
		direction = "south"
	elif var == "a":
		direction = "west"
	elif var == "on":
		click_on = True
	else:
		click_on = False

	print "With click set to: " + str(click_on) + " and direction set to: " + direction
	print




	headers = {'Content-Type': 'application/json'}
	event_data = {'direction': direction, 'click_on': click_on}
	server_return = requests.post(server_ip, json=event_data)



