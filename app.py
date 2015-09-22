from gevent import monkey
monkey.patch_all()

import time,json
from threading import Thread
from flask import Flask, render_template, session, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, disconnect
import io
import random

app = Flask(__name__)
app.debug = True
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)
thread = None

'''
def background_thread():
    """Send server generated events to clients."""
    count = 0
    while True:
        time.sleep(1)
        if count > 30:
            count = 0
        count += 1
        msg = ({
            'type': 'vehicle_status',
            'vehicles':[
                {'vehicle_id': i,
                    'latitude': 31.0268809+count*0.1 + i * 0.1,
                    'longitude': 121.4367119 - count*0.1,
                    'state_of_charge':0.56+count*0.01,
                    'state_of_health': 0.678989+count*0.01,
                    } for i in range(count)
                ],
            'count': count
            })
        emit('vehicle_update',msg)
'''

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/app/<path:path>')
def send_static(path):
    return send_from_directory('app', path)

@app.route('/dist/<path:path>')
def send_dist(path):
    return send_from_directory('dist', path)

@app.route('/bower_components/<path:path>')
def send_bower(path):
    return send_from_directory('bower_components', path)

@socketio.on('get_id_info')
def send_id_info(msg):
    vehicle_id = msg['vehicle_id']
    #print "vehicle_id is " + vehicle_id
    count = random.uniform(10,100)
    msg = {
        'type': 'vehicle_status',
        'data': {   
            'vehicle_id': vehicle_id,
            'latitude': 31.0268809 + count,
            'longitude': 121.4367119 - count,
            'SOC': count*0.01,
            'SOH': 1 - count*0.01,
            } 
        }

    emit('vehicle_update',json.dumps(msg))


@socketio.on('my event')
def test_message(message):
    #session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my response',
         #{'data': message['data'], 'count': session['receive_count']})
         {'data': message['data']})


@socketio.on('connect')
def test_connect():
    print 'Client connected'


'''
@socketio.on('my broadcast event', namespace='/test')
def test_broadcast_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my response',
         {'data': message['data'], 'count': session['receive_count']},
         broadcast=True)

@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected')
'''
if __name__ == '__main__':
    #socketio.run(app)
    #thread = Thread(target=background_thread)
    #thread.start()
    socketio.run(app, host='0.0.0.0')
