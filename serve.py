#!/usr/bin/env python2
import SimpleHTTPServer
import os


class MyHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
	def translate_path(self, path):
		if path.startswith("/~zhaoyich/"):
			path = path[len("/~zhaoyich/"):]
		return SimpleHTTPServer.SimpleHTTPRequestHandler.translate_path(self, path)

if __name__ == "__main__":
	SimpleHTTPServer.test(MyHTTPRequestHandler)
