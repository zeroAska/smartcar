
    
from gevent import monkey
monkey.patch_all()
from datetime import datetime,timedelta
import time,json
import threading
from threading import Thread
from flask import Flask, render_template, session, request, send_from_directory, jsonify, send_file, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, disconnect
import io
import random
import numpy as np
import scipy.io as sio
import skfuzzy as fuzz
import matplotlib.pyplot as plt
import sys
import time,signal
import os

def signal_handler(signal, frame):
    print 'You pressed Ctrl+C!'
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
app.debug = True
#app.config['SECRET_KEY'] = 'secret!'
#socketio = SocketIO(app)
thread = None
lock = threading.Lock()

####################### TO BE SETUP BY USER ############
# DATA_SOURCE: 'disk' or 'network'
DATA_SOURCE = 'disk'
if DATA_SOURCE == 'disk':
    data_all_mat = sio.loadmat('Data_20140711_all.mat')
    data_all = np.array(data_all_mat['Data_all'])
    print("Size of Data_all is:")
    print(str(data_all.shape))
########################################################

cars = {}

##################### fuzzy constants ######################
throttle_in = np.arange(0,101)
speed_in = np.arange(0,2.001,step = 0.001)
driving_behavior_in = np.arange(0,1.001, step = 0.001)
# Membership functions for throttle
t_gentle = fuzz.trapmf(throttle_in, [-15.6,0,30, 50])
t_normal = fuzz.trimf(throttle_in, [30, 50, 75])
t_hard = fuzz.trapmf(throttle_in, [50, 75, 100, 120])
    
# Membership functions for speed
n_slow = fuzz.trapmf(speed_in,[0,0,0.8,1])
n_normal = fuzz.trimf(speed_in,[0.8,1,1.2])
n_fast = fuzz.trapmf(speed_in,[1,1.2,2,2])

# Membership functions for driving_behavior
d_eco = fuzz.trimf(driving_behavior_in,[-0.5,0,0.5])
d_mod = fuzz.trimf(driving_behavior_in,[0,0.5,1])
d_agg = fuzz.trimf(driving_behavior_in,[0.5,1,1.5])
#############################################################

# key algorithm to compute the driving behavior
def evalfis(input_throttle, input_speed):
    if input_throttle >= 100:
        print "Note: input throttle is over the limit 100"
        input_throttle = 100
    if input_speed >= 2.0:
        print "Note: input speed is over the limit 2.0"
        input_speed = 2.0
    #print "input_throttle is "+ str(input_throttle)
    #print "input_speed is "+ str(input_speed)
           
    if input_throttle >= -15 and input_throttle <= 50:
        t_level_gentle = fuzz.interp_membership(throttle_in, t_gentle, input_throttle)
    else:
        t_level_gentle = 0
    #print "t_level_gentle" + str(t_level_gentle)
    if (input_throttle >= 30 and input_throttle <= 75):
        t_level_normal = fuzz.interp_membership(throttle_in, t_normal, input_throttle)
    else:
        t_level_normal = 0
    #print "t_level_normal" + str(t_level_normal)
    if (input_throttle >=50 and input_throttle<= 120):
        t_level_hard = fuzz.interp_membership(throttle_in, t_hard, input_throttle)
    else:
        t_level_hard = 0
    #print "t_level_hard" + str(t_level_hard)
    #print t_level_hard
    if (input_speed  <= 1):
        n_level_slow = fuzz.interp_membership(speed_in,n_slow,input_speed)
    else:
        n_level_slow = 0
    #print "n_level_slow" + str(n_level_slow)
    
    if (input_speed <= 1.2 and input_speed >= 0.8):
        n_level_normal = fuzz.interp_membership(speed_in,n_normal,input_speed)
    else:
        n_level_normal = 0
    #print "n_level_normal" + str(n_level_normal)
    
    if (input_speed>=1 and input_speed <= 2):
        n_level_fast = fuzz.interp_membership(speed_in,n_fast,input_speed)
    else:
        n_level_fast = 0
    #print "n_level_fast" + str(n_level_fast)
    
    R1 = min(t_level_gentle,n_level_slow)
    R2 = min(t_level_gentle,n_level_normal)
    R3 = min(t_level_normal,n_level_slow)
    dr_activation_eco = np.fmin( max(R3, max(R1,R2)), d_eco  )
    #print "R1: %s, R2: %s, R3: %s" %(R1,R2,R3)
    
    R4 = min(t_level_normal,n_level_normal)
    dr_activation_mod = np.fmin(R4, d_mod)
    #print "R4: %s" %(R4)
        
    R5 = min(t_level_normal,n_level_fast)
    R6 = min(t_level_gentle,n_level_fast)
    R7 = t_level_hard
    #print "R5: %s, R6: %s, R7: %s" %(R5,R6,R7)
    dr_activation_agg = np.fmin( max(R7, max(R5,R6) ), d_agg ) 
    ############################## FOR DEBUGGING ######################
    #fig, (ax0) = plt.subplots(nrows=1, figsize=(8, 9))
    #ax0.plot(driving_behavior_in,dr_activation_eco, 'b', linewidth=1.5)
    #ax0.plot(driving_behavior_in,dr_activation_mod, 'g', linewidth=1.5)
    #ax0.plot(driving_behavior_in, dr_activation_agg, 'r', linewidth=1.5)
    #ax0.set_title('driving_behavior')
    #ax0.legend()
    #plt.tight_layout()
    #plt.show()
    #stdin.readline()
    ################################################################### 
    # aggregate all seven output
    aggregated = np.fmax(dr_activation_agg, np.fmax(dr_activation_mod,dr_activation_eco))
    result = fuzz.defuzz(driving_behavior_in, aggregated, 'centroid')
    #print ("fuzz result is " + str(result))
    return result


class Car():
    """docstring for Car"""
    #  disk_or_network = 'disk': read from disk. 
    #  disk_or_network = 'network': read from network
    def __init__(self, car_id,disk_or_network):
        self.id = car_id
        self.soc = []
        self.latitude = []
        self.longitude = []
        self.data_time = []
        self.throttle = []
        self.speed = []
        self.driving_behavior = []
        self.last_access_time = datetime.now()
        self.total_num_of_data = 0    
        self.dist =0    
        self.self_lock = threading.Lock()
        # tmp use

        # some constants
        self.data_max_length = 100
        self.max_no_access_time = 600
        self.fuzzy_input_buf_size = 50
        self.fuzzy_min_delta_dist = 50
        
    def set_basic(self,soc,latitude,longitude,data_time,throttle,speed,driving_behavior):
        self.self_lock.acquire()
        self.soc.append(soc)
        self.latitude.append(latitude)
        self.longitude.append (longitude)
        self.data_time.append( data_time)
        self.throttle.append(throttle)
        self.speed.append(speed)
        self.driving_behavior.append(driving_behavior)
        self.self_lock.release()
        if len(self.data_time) > self.data_max_length:
            self.self_lock.acquire()
            self.soc.pop(0)
            self.latitude.pop(0)
            self.longitude.pop(0)
            self.data_time.pop(0)
            self.throttle.pop(0)
            self.speed.pop(0)
            self.driving_behavior.pop(0)
            self.self_lock.release()
            
    # method = 'disk': read from disk. 
    # method = 'network': read from network
    def update_new_data(self,method = 'disk'):
        if method == 'disk':
            # read data from disk or network 
            i =  self.total_num_of_data % data_all.shape[0]
            throttle = data_all[i,110 - 1]
            time_stamp = data_all[i,112 - 1]
            speed = data_all[i,0]
            latitude = data_all[i,113 - 1]
            longitude = data_all[i,114 - 1]
            soc = data_all [i,4-1]
            driving_behavior = self.calculate_driving_behavior()
            self.set_basic(soc,latitude,longitude,time_stamp,throttle,speed,driving_behavior)
            self.total_num_of_data += 1
            time.sleep(0.1)

        #TODO: implete the version of using network data source
        else:
            pass
        
    def set_access_time(self):
        self.last_access_time = datetime.now()

    def calculate_driving_behavior(self):
        if len(self.data_time) == 0:
            return np.nan
        if len(self.speed) == 1:
            last_speed = self.speed[0] 
            last_time_stamp = self.data_time[0]
        else:
            last_speed = self.speed[-2]
            last_time_stamp = self.data_time[-2]
        if len(self.speed) <= self.fuzzy_input_buf_size:
            start_index = 0
        else:
            start_index = -self.fuzzy_input_buf_size
        # dist is accumulative. Between two checkpoint, the disk gain is avg_speed times total time in seconds
        self.dist = self.dist + (last_speed + self.speed[-1]) / 2 / 3.6 * ( (self.data_time[-1]-last_time_stamp)*3600*24 )
        if self.dist >= self.fuzzy_min_delta_dist:
            throttle_input = max(self.throttle[start_index:-1])
            speed_input = np.mean(np.array(self.speed[start_index:-1]) )
            # use fuzzy logic to determine the current driving behavior
            fis_out = evalfis(throttle_input,speed_input)
        else:
            fis_out = np.nan
        return fis_out


def main_loop():
    car1 = Car(1,DATA_SOURCE)
    cars[1] = (car1)
    while True:
        #print "# of current cars is "+ str(len(cars))
        for key in cars:
            if (datetime.now() - cars[key].last_access_time ).total_seconds() > cars[key].max_no_access_time:
                lock.acquire()
                cars.pop(key,None)
                lock.release()
                print "Due to no response for too long, remove car_id "+str(cars[key].car_id)
                continue
            cars[key].update_new_data(DATA_SOURCE)
        
            


@app.route('/new_car', methods = ['POST'])
def gen_new_car():
    new_car_id = request.form['id']
    print "new car registered: id = "+ str(new_car_id)
    if new_car_id in cars:
        print "this car has already been registered!"
        return jsonify(car_id= new_car_id, msg = "the car was registered")
    else:
        lock.acquire()
        cars["car_id"] = Car(new_car_id)
        lock.release()
        return jsonify(car_id= new_car_id, msg = "Successfully register" + str(new_car_id))
    
@app.route('/')
def index():
    #return send_file('index.html')
    return make_response(open('templates/index.html').read())

@app.route('/car_num',methods = ['GET'])
def get_car_num():
    num = len(cars)
    return str(num)

# NOte: slow, because we need to look up the list for multiple times
@app.route('/get_car_basic_info',methods = ['GET'])
def get_car_basic_info():
    #example: user = request.args.get('user')
    car_id = int(request.args.get('id'))
    print "get car basic info: id = "+ str(car_id)
    
    if car_id in cars:
        car = cars[car_id]
        car.set_access_time()
        return jsonify(car_id = car_id, latitude = car.latitude[-1], longitude = car.longitude[-1], soc = car.soc[-1])
    else:
        print "No car has id: "+ str(car_id)
        return None
    
@app.route('/get_car_one_info',methods = ['GET'])
def get_car_one_info():
    if len(request.args) is not 3:
        print "get_car_one_info: the num of args should not be "+str(request.args)
        return None
    car_id = int(request.args.get('id'))
    entry = request.args.get('entry')
    num = int(request.args.get('num'))
    print type(car_id)
    if car_id in cars:
        car = cars[car_id]
        num = min(len(car.soc),num)
        val = {
            'soc': car.soc[-num:-1],
            'latitude' : car.latitude[-num:-1],
            'longitude' : car.longitude[-num:-1],
            'data_time' : car.data_time[-num:-1],
            'throttle' : car.throttle[-num:-1],
            'speed': car.speed[-num:-1], 
            'driving_behavior': car.driving_behavior[-num:-1]
        }[entry]
        car.set_access_time()
        return jsonify(entry = val)
    else:
        print "No car has id: "+ str(car_id)
        return None


@app.route('/get_driving_behavior',methods = ['GET'])
def get_driving_behavior():
    if len(requests.args) is not 1:
        return None
    car_id = int(request.args.get('id'))
    if car_id in cars:
        car = cars[car_id]
        car.set_access_time()
        return car.calculate_driving_behavior()
    else:
        print "No car has id: "+ str(car_id)
        return None

if __name__ == '__main__':
    #socketio.run(app)
    thread = Thread(target=main_loop)
    thread.start()
    app.run(host='0.0.0.0')
