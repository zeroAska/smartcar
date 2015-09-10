from threading import Thread
import threading
import numpy as np
import scipy.io as sio
import skfuzzy as fuzz


lock = threading.Lock()

def evalfis(input_throttle, input_speed):
    print "input_throttle is "+ str(input_throttle)
    print "input_speed is "+ str(input_speed)
    throttle_in = np.arange(0,101)
    speed_in = np.arange(0,2.0,step = 0.001)
    driving_behavior_in = np.arange(0,1.0, step = 0.001)
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

    t_level_gentle = fuzz.interp_membership(throttle_in, t_gentle, input_throttle)
    t_level_normal = fuzz.interp_membership(throttle_in, t_normal, input_throttle)
    t_level_hard = fuzz.interp_membership(throttle_in, t_hard, input_throttle)

    print input_speed
    if (input_speed  <= 1):
        n_level_slow = fuzz.interp_membership(speed_in,n_slow,input_speed)
    else:
        n_level_slow = np.nan
    if (input_speed <= 1.2 and input_speed >= 0.8):
        n_level_normal = fuzz.interp_membership(speed_in,n_normal,input_speed)
    else:
        n_level_normal = np.nan
    if (input_speed>=1 and input_speed < 2):
        n_level_fast = fuzz.interp_membership(speed_in,n_fast,input_speed)
    else:
        n_level_fast = np.nan
    
    R1 = min(t_level_gentle,n_level_slow)
    R2 = min(t_level_gentle,n_level_normal)
    R3 = min(t_level_normal,n_level_slow)
    dr_activation_eco = np.fmin( max(R3, max(R1,R2)), d_eco  )

    R4 = min(t_level_normal,n_level_normal)
    dr_activation_mod = np.fmin(R4, d_mod)

    R5 = min(t_level_normal,n_level_fast)
    R6 = min(t_level_gentle,n_level_fast)
    R7 = t_level_hard
    dr_activation_agg = np.fmin( max(R7, max(R5,R6) ), d_agg )

    # aggregate all seven output
    aggregated = np.fmax(dr_activation_agg, np.fmax(dr_activation_mod,dr_activation_eco))
    result = fuzz.defuzz(driving_behavior_in, aggregated, 'centroid')
    print ("fuzz result is " + str(result))
    return result

def fuzzy_thread(driving_behavior):
    data_all_mat = sio.loadmat('Data_20140711_all.mat')
    data_all = np.array(data_all_mat['Data_all'])
    print("Size of Data_all is:")
    print(str(data_all.shape))

    take = 1
    buf = np.array([])
    dist = 0

    rows = data_all.shape[0]
    last_speed = 0
    last_time_stamp = 0

    for i in range(1,rows):
        #print "i is " + str(i) 
        # 110th col is throttle
        throttle = data_all[i,110 - 1]
        time_stamp = data_all[i,112 - 1]
        speed = data_all[i,0]
        if throttle == 0:
            # no throttle 
            # 112th col is time stamp

            output = np.array([time_stamp,np.nan])
            lock.acquire(True)
            if driving_behavior.size == 0:
                driving_behavior = np.array([output])
            else:
                driving_behavior = np.vstack((driving_behavior, output))
            lock.release()
            
        else:
            # 1st col is speed
            
            feature = np.array([throttle,speed / 30])
            if buf.size == 0:
                buf = np.array([feature])
            else:
                buf = np.vstack((buf,feature))
            #print buf
            # dist is accumulative. Between two checkpoint, the disk gain is avg_speed times total time in seconds
            dist = dist + (last_speed + speed) / 2 / 3.6 * ( (time_stamp-last_time_stamp)*3600*24 )
            if dist >= 50:
                
                fuzzy_in = np.array([ np.amax(buf,axis = 0)[0],np.mean(buf,axis=0)[1] ])

                # use fuzzy logic to determine the current driving behavior
                fis_out = evalfis(fuzzy_in[0],fuzzy_in[1])
                
                output = np.array([time_stamp, fis_out])
                lock.acquire()
                driving_behavior = np.vstack((driving_behavior,output))
                lock.release()
                buf = np.array([])

            last_speed = speed
            last_time_stamp = time_stamp
    print(driving_behavior.shape)
    print driving_behavior
    sio.savemat("driving_behavior_out.mat",{'data':driving_behavior})

# driving_behavior is an numpy array.
def fuz(driving_behavior):
    t = Thread(target = fuzzy_thread,args = (driving_behavior,))
    t.start()
    t.join()

curr_driving_behavior = np.array([np.nan, np.nan])
fuz(curr_driving_behavior)
	
