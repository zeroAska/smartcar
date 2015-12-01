
from gevent import monkey
monkey.patch_all()
from datetime import datetime,timedelta
import time,json
import threading
from threading import Thread
from flask import Flask, render_template, session, request, send_from_directory, jsonify, send_file, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, disconnect
from math import factorial
import io
import random
import numpy as np
import scipy.io as sio
import skfuzzy as fuzz
import matplotlib.pyplot as plt
import sys
import time,signal
import os
import math
import neurolab as nl
import matlab
import matlab.engine

eng = matlab.engine.start_matlab()
print "Matlab successfully launched!"

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
    route_sequence_mat = sio.loadmat('Route_Sequence.mat')
    Route_Sequence = np.array(route_sequence_mat['Route_Sequence'])
    roadSegmentation_mat = sio.loadmat('RoadSegmentation.mat')
    RoadSection = np.array(roadSegmentation_mat['RoadSection'])
    # RBF_net_mat = sio.loadmat('RBF_net.mat')
    normalize_par_mat = sio.loadmat('Normalize_par.mat')
    lx = np.array(normalize_par_mat['lx'])
    ly = np.array(normalize_par_mat['ly'])
    soc_ref_mat = sio.loadmat('SoC_ref.mat')
    SoC_ref = np.array(soc_ref_mat['SoC'])
    
    print("Size of Data_all is:")
    print(str(data_all.shape))
########################################################

cars = {}

##################### fuzzy constants ######################
throttle_in = np.arange(0,101)
speed_in = np.arange(0,2.001,step = 0.001)
driving_behavior_in = np.arange(0,1.001, step = 0.001)

error_thres = 0.0098
Gain = 1
Capacity_n = 73.12

index_temp=[]
for i in range(0, len(data_all)):
    if data_all[i, 115-1]==47:
        index_temp.append(i)
Seg_index=[]
for i in range(0, len(index_temp)-1):
    if abs(index_temp[i]-index_temp[i+1])>10:
        Seg_index.append(index_temp[i])

Route_Sequence=np.unique(data_all[Seg_index[0]:(Seg_index[1]+1), 115-1])


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

# Curve Smoothing
# http://stackoverflow.com/questions/22988882/how-to-smooth-a-curve-in-python
def savitzky_golay(y, window_size, order, deriv=0, rate=1):
    try:
        window_size = np.abs(np.int(window_size))
        order = np.abs(np.int(order))
    except ValueError, msg:
        raise ValueError("window_size and order have to be of type int")
    if window_size % 2 != 1 or window_size < 1:
        raise TypeError("window_size size must be a positive odd number")
    if window_size < order + 2:
        raise TypeError("window_size is too small for the polynomials order")
    order_range = range(order+1)
    half_window = (window_size -1) // 2
    # precompute coefficients
    b = np.mat([[k**i for i in order_range] for k in range(-half_window, half_window+1)])
    m = np.linalg.pinv(b).A[deriv] * rate**deriv * factorial(deriv)
    # pad the signal at the extremes with
    # values taken from the signal itself
    firstvals = y[0] - np.abs( y[1:half_window+1][::-1] - y[0] )
    lastvals = y[-1] + np.abs(y[-half_window-1:-1][::-1] - y[-1])
    y = np.concatenate((firstvals, y, lastvals))
    return np.convolve( m[::-1], y, mode='valid')


class Car():
    """docstring for Car"""
    #  disk_or_network = 'disk': read from disk. 
    #  disk_or_network = 'network': read from network
    def __init__(self, car_id,disk_or_network):
        self.id = car_id
        self.latitude = []
        self.longitude = []
        self.data_time = []
        self.throttle = []
        self.speed = []
        self.driving_behavior = []
        
        self.soc_prediction = [] # predicted SOC
        self.soc_est =[]
        self.soc_true=[]
        self.truefinal_soc=[]
        self.voltage=[]
        
        self.last_access_time = datetime.now()
        self.total_num_of_data = 0    
        self.dist =0    
        self.self_lock = threading.Lock()
        # tmp use

        # some constants
        self.data_max_length = 2000
        self.max_no_access_time = 600
        self.fuzzy_input_buf_size = 50
        self.fuzzy_min_delta_dist = 50
        
    def set_basic(self,soc,latitude,longitude,data_time,throttle,speed,driving_behavior):
        self.self_lock.acquire()
        self.soc_prediction.append(soc)
        self.latitude.append(latitude)
        self.longitude.append (longitude)
        self.data_time.append( data_time)
        self.throttle.append(throttle)
        self.speed.append(speed)
        # self.driving_behavior.append(driving_behavior)
        self.self_lock.release()
        if len(self.data_time) > self.data_max_length:
            self.self_lock.acquire()
            self.soc_prediction.pop(0)
            self.latitude.pop(0)
            self.longitude.pop(0)
            self.data_time.pop(0)
            self.throttle.pop(0)
            self.speed.pop(0)
            self.driving_behavior.pop(0)
            self.self_lock.release()
    
    def set_access_time(self):
        self.last_access_time = datetime.now()
    
            
    # method = 'disk': read from disk. 
    # method = 'network': read from network
    def update_new_data(self,method = 'disk'):
        if method == 'disk':
            '''
            # read data from disk or network 
            i =  self.total_num_of_data % data_all.shape[0]
            throttle = data_all[i,110 - 1]
            time_stamp = data_all[i,112 - 1]
            speed = data_all[i,0]
            latitude = data_all[i,113 - 1]
            longitude = data_all[i,114 - 1]
            soc = data_all [i,4-1]
            voltage = data_all [i, 2-1] #XXXX also sending to frontend?
                        
            self.calculate_driving_behavior()
            self.set_basic(soc,latitude,longitude,time_stamp,throttle,speed)
            self.total_num_of_data += 1
            '''
            self.calculate_soc()
            time.sleep(0.1)

        #TODO: implete the version of using network data source
        else:
            pass
    
    '''
    def calculate_driving_behavior(self):
        XXXX_loop
        output_ref=(self.voltage-ly[0][0])/(ly[0][1]-ly[0][0])
        output_est=net.sim(np.transpose(input_temp))
        if abs(output_est-output_ef) > error_thres:
            temp = abs(output_est-output_ref)*Gain
            temp.append(0.001)
            SoC_last = SoC_last-np.sign(output_est-output_ref)*min(temp[0:-1])
        else:
            SoC_last = SoC_last-(self.current_data_3[-2]+self.current_data_3[0])/2*(self.timestamp[0]-self.timestamp[-2])*24/Capacity_n
        
        if len(self.data_time) == 0:
            self.driving_behavior.append(np.nan)
        if len(self.speed) == 1:
            last_speed = self.speed[0] 
            last_time_stamp = self.data_time[0]
        else:
            last_speed = self.speed[-2]
            last_time_stamp = self.data_time[-2] #XXX Why -2??
        if len(self.speed) <= self.fuzzy_input_buf_size:
            start_index = 0
        else:
            start_index = -self.fuzzy_input_buf_size

        # dist is accumulative. Between two checkpoint, the disk gain is avg_speed times total time in seconds
        dist_diff = (last_speed + self.speed[-1]) / 2 / 3.6 * ( (self.data_time[-1]-last_time_stamp)*3600*24 )
        if dist_diff > 0:
            self.dist = self.dist+dist_diff
            if self.dist >= self.fuzzy_min_delta_dist:
                throttle_input = max(self.throttle[start_index:-1])
                speed_input = np.mean(np.array(self.speed[start_index:-1]) )
                # use fuzzy logic to determine the current driving behavior
                Behavior_fuzzy = evalfis(throttle_input,speed_input)
                if Behavior_fuzzy <= 0.3:
                    self.driving_behavior.append(1)
                    self.soc_prediction.append(consum_count_all+ XXX_RoadMining/self.voltage/3600*0.95)
                elif Behavior_fuzzy > 0.3 and Behavior_fuzzy <= 0.5:
                    self.driving_behavior.append(1)
                    self.soc_prediction.append(consum_count_all+ XXX_RoadMining/self.voltage/3600)
                else:
                    self.driving_behavior.append(1)
                    self.soc_prediction.append(consum_count_all+ XXX_RoadMining/self.voltage/3600*1.05)
            else:
                fis_out = np.nan
        return fis_out
    '''

    def calculate_soc(self):
        for j in range(0,len(Seg_index)-1):
            data_temp=data_all[Seg_index[j]+1:Seg_index[j+1]+1,:]
            Route_Sequence=np.unique(data_temp[:,115-1])
            Remaining_seg=Route_Sequence
            DrivingBehavior=np.array([data_temp[0,112-1],2])
            
            V=np.mean(data_temp[:,2-1]) # Initial Voltage
            To_consume=np.sum(RoadSection[:,6-1]*RoadSection[:,5-1])/V/3600.0
            consum_count_thisSeg=0
            consum_count_all=0
            SoC_prediction=np.array([data_temp[0,112-1], To_consume])
            SoC_comsume_true=np.sum((data_temp[2:len(data_temp),3-1]+data_temp[1:(len(data_temp)-1),3-1])/2.0*((data_temp[2:len(data_temp),112-1]-data_temp[1:(len(data_temp)-1),112-1]))*24)
            
            Buffer=[]
            dist=0
            DrivingBehavior=np.array([data_temp[0,112-1],2])
            
            if j==0:
                SoC_last=data_temp[0,4-1]/100.0
            else:
                SoC_last=self.soc_est[len(self.soc_est)-1][0]
            
            # SoC_output=[SoC_last, data_temp[0,112-1]]
            self.soc_est.append([SoC_last, data_temp[0,112-1]]) #Try1

            for ii in range((Seg_index[j]+1), Seg_index[j+1]):
                self.soc_true.append([SoC_ref[ii,0], data_temp[ii-(Seg_index[j]+1), 112-1]]) # Only use for validation

            # data_temp_matlab=matlab.double(data_temp[:,67-1].tolist())
            # data_temp_matlab=eng.smooth(data_temp_matlab, 20)
            data_temp[:,67-1]=savitzky_golay(data_temp[:,67-1], 19, 2) # window size 20, polynomial order 2
            data_temp[:,3-1]=savitzky_golay(data_temp[:,3-1], 19, 2) #XXXXX
        
            for i in range(1, len(data_temp)-1):
                input_temp=[data_temp[i-1, 67-1], data_temp[i-1, 3-1], data_temp[i,3-1], SoC_last]
                for jj in range(0,len(input_temp)-1):
                    input_temp[jj]=(input_temp[jj]-lx[jj,0])/(lx[jj,1]-lx[jj,0])/1.0
                    
                output_ref=(data_temp[i,67-1]-ly[0][0])/(ly[0][1]-ly[0][0])/1.0
                output_est=eng.SoC_Simulate(input_temp[0], input_temp[1], input_temp[2], input_temp[3])
                if abs(output_est-output_ref) > error_thres:
                    SoC_last = SoC_last-eng.sign(output_est-output_ref)*min([abs(output_est-output_ref)*Gain, 0.001])
                else:
                    SoC_last = SoC_last-(data_temp[i-1,3-1]+data_temp[i,3-1])/2.0*((data_temp[i,112-1]-data_temp[i-1,112-1])*24)/Capacity_n
                
                self.soc_est.append([SoC_last, data_temp[0,112-1]]) #Try1
                # SoC_output.append([SoC_last,data_temp[i,112-1]])
                # print SoC_output
                
                dist_diff=(data_temp[i-1,0]+data_temp[i,0])/2/3.6*((data_temp[i,112-1]-data_temp[i-1,112-1])*3600*24)
                
                if dist_diff > 0:
                    feature=[data_temp[i,100-1], data_temp[i,0]/30.0]
                    Buffer.append(feature)
                    dist=dist+dist_diff

                    #print Buffer

                    if dist>=50 or len(Buffer)>10:                 
                        #if self.dist >= self.fuzzy_min_delta_dist:
                        # throttle_input = max(self.throttle[start_index:-1])
                        # speed_input = np.mean(np.array(self.speed[start_index:-1]) )
                        # use fuzzy logic to determine the current driving behavior
                        Behavior_fuzzy = evalfis(max(Buffer[:][0]),np.mean(Buffer[:][1]))
                        temp_sum=0
                        for ii in range(0,len(Remaining_seg)-1):
                            temp_sum=temp_sum+RoadSection[Remaining_seg[ii],6-1]*RoadSection[Remaining_seg[ii],5-1]
                        if Behavior_fuzzy <= 0.3:
                            DrivingBehavior=1
                            SoC_prediction=[data_temp[i,112-1], consum_count_all+ temp_sum/data_temp[i,2-1]/3600.0*0.95]
                        elif Behavior_fuzzy > 0.3 and Behavior_fuzzy <= 0.5:
                            DrivingBehavior=2
                            SoC_prediction=[data_temp[i,112-1], consum_count_all+ temp_sum/data_temp[i,2-1]/3600.0]
                        else:
                            DrivingBehavior=3
                            SoC_prediction=[data_temp[i,112-1], consum_count_all+ temp_sum/data_temp[i,2-1]/3600.0*1.05]
                        Buffer=[]
                        dist=0
                        
                        self.driving_behavior.append(DrivingBehavior) 
                        self.soc_prediction.append(SoC_prediction) 
                        self.total_num_of_data += 1 #XXXX should be in update_new_data()
                        # car.soc_prediction is a 2-d list, in which the first column is the true soc from data_all and the second column is the predicted soc
                        self.truefinal_soc.append(SoC_comsume_true)
                        # self.soc_est.append(SoC_output) #XXXX
                        # self.soc_true.append(SoC_true) #XXXX
                    else:
                        DrivingBehavior=np.nan
                        SoC_prediction=np.nan
                
                consum_count_thisSwg=consum_count_thisSeg+(data_temp[i-1,3-1]+data_temp[i-1,3-1])/2.0*((data_temp[i,112-1]-data_temp[i-1,112-1])*24)
                if data_temp[i,115-1]-data_temp[i-1,115-1]>0:
                    consum_count_all=consum_count_all+consum_count_thisSeg
                    consum_count_thisSeg=0
                    for k in range(0, len(Route_Sequence)-1):
                        if Route_Sequence[k]==data_temp[i,115-1]:
                            temp1=k
                            break
                    Remaining_seg=Route_Sequence[temp1:(len(Route_Sequence)-1)]
    

'''
# to test calculate_soc() only
car1 = Car(1,DATA_SOURCE)
cars[1] = (car1)
    #print "# of current cars is "+ str(len(cars))
for key in cars:
    if (datetime.now() - cars[key].last_access_time ).total_seconds() > cars[key].max_no_access_time:
        lock.acquire()
        car_id = cars[key].car_id
        cars.pop(key,None)
        lock.release()
        print "Due to no response for too long, remove car_id "+str(car_id)
        continue
    cars[key].calculate_soc()
    print cars[key].soc_est
'''

def main_loop():
    car1 = Car(1,DATA_SOURCE)
    cars[1] = (car1)
    while True:
        #print "# of current cars is "+ str(len(cars))
        for key in cars:
            if (datetime.now() - cars[key].last_access_time ).total_seconds() > cars[key].max_no_access_time:
                lock.acquire()
                car_id = cars[key].car_id
                cars.pop(key,None)
                lock.release()
                print "Due to no response for too long, remove car_id "+str(car_id)
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
    return jsonify(total=num)

# Note: slow, because we need to look up the list for multiple times
@app.route('/get_car_basic_info',methods = ['GET'])
def get_car_basic_info():
    #example: user = request.args.get('user')
    car_id = int(request.args.get('id'))
    print "get car basic info: id = "+ str(car_id)
    
    if car_id in cars:
        car = cars[car_id]
        car.set_access_time()
        return jsonify(car_id = car_id, latitude = car.latitude[-1], longitude = car.longitude[-1], soc = car.soc_prediction[-1])
    else:
        print "No car has id: "+ str(car_id)
        return None
    
@app.route('/get_car_one_info',methods = ['GET'])
def get_car_one_info():
    car_id = int(request.args['id'])
    print type(car_id)
    if car_id in cars:
        car = cars[car_id]
        time_unit = 0.5
        bucket_time = 10.0
        buckets = 50
        val = {
            'soc': list_bucket_average(car.soc_prediction[1], time_unit, bucket_time, buckets), 
            # car.soc_prediction is a 2-d list, in which the first column is the true soc from data_all and the second column is the predicted soc
            'latitude' : list_bucket_average(car.latitude, time_unit, bucket_time, buckets),
            'longitude' : list_bucket_average(car.longitude, time_unit, bucket_time, buckets),
            'data_time' : list(d * 3600 * 24 for d in list_bucket_average(car.data_time, time_unit, bucket_time, buckets)),
            'throttle' : list_bucket_average(car.throttle, time_unit, bucket_time, buckets),
            'speed': list_bucket_average(car.speed, time_unit, bucket_time, buckets),
            'driving_behavior': list_bucket_average(car.driving_behavior, time_unit, bucket_time, buckets),
            'last_driving_behavior': car.driving_behavior[-1] if not math.isnan(car.driving_behavior[-1]) else 0,
        }
        car.set_access_time()
        return jsonify(entry = val)
    else:
        print "No car has id: "+ str(car_id)
        return None

def list_bucket_average(all_data, time_unit, bucket_time, buckets):
    lst = list(iter_bucket_average(all_data, time_unit, bucket_time, buckets))
    while len(lst) < buckets:
        lst.insert(0, 0)

    return lst

def iter_bucket_average(all_data, time_unit, bucket_time, buckets):
    display_time = bucket_time * buckets
    bucket_size = int(bucket_time / time_unit)
    data_set = all_data[-int(display_time / time_unit): -1]
    for i in range(0, len(data_set), bucket_size):
        s = data_set[i : i+bucket_size]
        value = sum(s) / float(len(s))
        if math.isnan(value):
            yield 0
        else:
            yield value


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


@app.route('/app/<path:path>')
def send_static(path):
    return send_from_directory('app', path)

@app.route('/dist/<path:path>')
def send_dist(path):
    return send_from_directory('dist', path)

@app.route('/bower_components/<path:path>')
def send_bower(path):
    return send_from_directory('bower_components', path)


if __name__ == '__main__':
    #socketio.run(app)
    thread = Thread(target=main_loop)
    thread.start()
    app.run(host='0.0.0.0')