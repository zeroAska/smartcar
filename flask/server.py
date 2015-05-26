from flask import Flask
import subprocess
import signal

app = Flask(__name__)

@app.route("/")
def index():
    return "Index Page"

@app.route("/data_collector")
def data_collector():
    #p = subprocess.Popen('../data_collector/run.sh',stdout=subprocess.PIPE)
    #out = p.stdout.readline()
    #print out
    return "Collecting Data from the chip..." 


#if __name__ == "__main__":
app.debug = True
app.run(host='0.0.0.0')
