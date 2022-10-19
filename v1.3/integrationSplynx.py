import requests
import os
import csv
import ipaddress
from ispConfig import allowedSubnets, ignoreSubnets, excludeSites, findIPv6usingMikrotik, bandwidthOverheadFactor, exceptionCPEs, splynx_api_key, splynx_api_secret, splynx_api_url
import shutil
import json
import time
import base64
from requests.auth import HTTPBasicAuth
if findIPv6usingMikrotik == True:
	from mikrotikFindIPv6 import pullMikrotikIPv6  


def isInAllowedSubnets(inputIP):
	isAllowed = False
	if '/' in inputIP:
		inputIP = inputIP.split('/')[0]
	for subnet in allowedSubnets:
		if (ipaddress.ip_address(inputIP) in ipaddress.ip_network(subnet)):
			isAllowed = True
	return isAllowed
	

def createShaper():
	print("Creating ShapedDevices.csv")
	
	#nonce = round((time.time() * 1000) * 100)
	#def generate_signature():
	#	key = str(nonce)+splynx_api_key
	#	key_bytes= bytes(key , 'latin-1') # Commonly 'latin-1' or 'ascii'
	#	data_bytes = bytes(splynx_api_secret, 'latin-1') # Assumes `data` is also an ascii string.
	#	return hmac.new(key_bytes, data_bytes , hashlib.sha256).hexdigest()
	#signature = generate_signature().upper()
	# Authorization: Splynx-EA (key=<key>&nonce=<nonce>&signature=<signature>)
	#splynxAuth = 'Splynx-EA (key=' + splynx_api_key + '&nonce=' + str(nonce) + '&signature=' + signature + ')'
	#headers = {'Authorization' : splynxAuth}
	credentials = splynx_api_key + ':' + splynx_api_secret
	credentials = base64.b64encode(credentials.encode()).decode()
	splynxAuth = 'Basic ' + credentials + ''
	headers = {'Authorization' : "Basic %s" % credentials}
	
	# Tariffs
	url = splynx_api_url + "/api/2.0/" + "admin/tariffs/internet"
	r = requests.get(url, headers=headers)
	data = r.json()
	tariff = []
	downloadForTariffID = {}
	uploadForTariffID = {}
	for tariff in data:
		tariffID = tariff['id']
		speed_download = round((int(tariff['speed_download']) / 1000))
		speed_upload = round((int(tariff['speed_upload']) / 1000))
		downloadForTariffID[tariffID] = speed_download
		uploadForTariffID[tariffID] = speed_upload
	
	# Customers
	addressForCustomerID = {}
	url = splynx_api_url + "/api/2.0/" + "admin/customers/customer"
	r = requests.get(url, headers=headers)
	data = r.json()
	customerIDs = []
	for customer in data:
		customerIDs.append(customer['id'])
		addressForCustomerID[customer['id']] = customer['street_1']
	
	# Routers
	ipForRouter = {}
	url = splynx_api_url + "/api/2.0/" + "admin/networking/routers"
	r = requests.get(url, headers=headers)
	data = r.json()
	for router in data:
		routerID = router['id']
		ipForRouter[routerID] = router['ip']
	
	# Customer services
	circuits = []
	for customerID in customerIDs:
		url = splynx_api_url + "/api/2.0/" + "admin/customers/customer/" + customerID + "/internet-services"
		r = requests.get(url, headers=headers)
		data = r.json()
		for service in data:
			routerID = service['router_id']
			ipAddress = ipForRouter[routerID]
			serviceID = service['id']
			tariff_id = service['tariff_id']
			dlMbps = downloadForTariffID[tariff_id]
			ulMbps = uploadForTariffID[tariff_id]
			address = addressForCustomerID[customerID]
			circuit = {
						'circuitID': serviceID,
						'circuitName': address,
						'deviceID': routerID,
						'deviceName': '',
						'parentNode': '',
						"mac": '',
						'ipv4': ipAddress,
						'ipv6': '',
						'minDownload': round(dlMbps*.98),
						'minUpload': round(ulMbps*.98),
						'maxDownload': dlMbps,
						'maxUpload': ulMbps
						}
			circuits.append(circuit)
	
	with open('ShapedDevices.csv', 'w') as csvfile:
		wr = csv.writer(csvfile, quoting=csv.QUOTE_ALL)
		wr.writerow(['Circuit ID', 'Circuit Name', 'Device ID', 'Device Name', 'Parent Node', 'MAC', 'IPv4', 'IPv6', 'Download Min', 'Upload Min', 'Download Max', 'Upload Max', 'Comment'])
		for circuit in circuits:
			wr.writerow((circuit['circuitID'], circuit['circuitName'], circuit['deviceID'], circuit['deviceName'], circuit['parentNode'], circuit['mac'], circuit['ipv4'], circuit['ipv6'], circuit['minDownload'], circuit['minUpload'], circuit['maxDownload'], circuit['maxUpload']))

def importFromSplynx():
	#createNetworkJSON()
	createShaper()

if __name__ == '__main__':
	importFromSplynx()
