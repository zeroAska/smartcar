import subprocess
import signal
from app import app
from models import Battery

@app.route("/")
def index():
    #return "Index Page"
    return Battery.query.filter_by(BATTERY_ID='26').first().BATTERY_NAME

@app.route("/data_collector")
def data_collector():
    #p = subprocess.Popen('../data_collector/run.sh',stdout=subprocess.PIPE)
    #out = p.stdout.readline()
    #print out
    return "Collecting Data from the chip..."
