import requests

#just setting up using localhost and port 3000
# see config.py for more info
server_ip = 'http://0.0.0.0:3000/'

headers = {'Content-Type': 'application/json'}
event_data = {'data_1': 481, 'data_2': -1, 'data_3': 47}
server_return = requests.post(server_ip, json=event_data)
print server_return.headers