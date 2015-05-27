# coding: utf-8
from app import db

metadata = db.Model.metadata

class Battery(db.Model):
    __tablename__ = 'battery'

    BATTERY_ID = db.Column(db.Integer, primary_key=True)
    BATTERY_TYPE_ID = db.Column(db.String(100), nullable=False, index=True)
    BATTERY_NAME = db.Column(db.String(100), nullable=False)

    car = db.relationship(u'Car', secondary='battery_sys_car')


t_battery_sys_car = db.Table(
    'battery_sys_car', metadata,
    db.Column('BATTERY_ID', db.ForeignKey(u'battery.BATTERY_ID'), primary_key=True, nullable=False),
    db.Column('CAR_ID', db.ForeignKey(u'car.CAR_ID'), primary_key=True, nullable=False, index=True)
)


class BatterySysUser(db.Model):
    __tablename__ = 'battery_sys_user'

    BATTERY_ID = db.Column(db.Integer, primary_key=True)
    USER_ID = db.Column(db.String(45), nullable=False, index=True)


class BatteryType(db.Model):
    __tablename__ = 'battery_type'

    battery_type_id = db.Column(db.String(100), primary_key=True)
    battery_type_name = db.Column(db.String(100), nullable=False)
    battery_capacity = db.Column(db.String(30), nullable=False)
    battery_voltage = db.Column(db.String(30), nullable=False)


class Car(db.Model):
    __tablename__ = 'car'

    CAR_ID = db.Column(db.Integer, primary_key=True)
    CAR_NAME = db.Column(db.String(50), nullable=False)
    CAR_TYPE_ID = db.Column(db.ForeignKey(u'car_type.CAR_TYPE_ID'), nullable=False, index=True)
    CAR_NUMBER = db.Column(db.String(50), nullable=False)
    BUY_TIME = db.Column(db.String(45), nullable=False)

    car_type = db.relationship(u'CarType')
    sys_user = db.relationship(u'SysUser', secondary='car_sys_user')
    lean = db.relationship(u'Lean', secondary='car_lean')


t_car_lean = db.Table(
    'car_lean', metadata,
    db.Column('CAR_ID', db.ForeignKey(u'car.CAR_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False),
    db.Column('LEAN_ID', db.ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False, index=True)
)


t_car_sys_user = db.Table(
    'car_sys_user', metadata,
    db.Column('CAR_ID', db.ForeignKey(u'car.CAR_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False),
    db.Column('USER_ID', db.ForeignKey(u'sys_user.USER_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False, index=True)
)


class CarType(db.Model):
    __tablename__ = 'car_type'

    CAR_TYPE_ID = db.Column(db.String(50), primary_key=True)
    CAR_TYPE_NAME = db.Column(db.String(100), nullable=False)
    CAR_BRAND = db.Column(db.String(100), nullable=False)


class Lean(db.Model):
    __tablename__ = 'lean'

    LEAN_ID = db.Column(db.String(10), primary_key=True, server_default=db.text("''"))
    DESCRIPTION = db.Column(db.String(100))


class Rc(db.Model):
    __tablename__ = 'rc'

    LEAN_ID = db.Column(db.ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False)
    PROCESS_TICK = db.Column(db.String(14), primary_key=True, nullable=False, server_default=db.text("''"))
    RC_INDEX = db.Column(db.String(45), nullable=False)

    lean = db.relationship(u'Lean')


class Soc(db.Model):
    __tablename__ = 'soc'

    LEAN_ID = db.Column(db.ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False)
    PROCESS_TICK = db.Column(db.String(14), primary_key=True, nullable=False)
    MINUTES_OF_DRIVING = db.Column(db.String(45))
    DISTANCES_OF_DRIVING = db.Column(db.String(45))
    SOC = db.Column(db.String(45))
    DRIVING_BEHAVIOR = db.Column(db.String(45))
    TIMES_TO_EMPTY_AGGRESSIVE = db.Column(db.String(45))
    TIMES_TO_EMPTY_MODERATE = db.Column(db.String(45))
    TIMES_TO_EMPTY_ECONOMIC = db.Column(db.String(45))
    DISTANCES_TO_EMPTY_AGGRESSIVE = db.Column(db.String(45))
    DISTANCES_TO_EMPTY_MODERATE = db.Column(db.String(45))
    DISTANCES_TO_EMPTY_ECONOMIC = db.Column(db.String(45))
    ENERGY_CONSUMPTION_RATE = db.Column(db.String(45))
    START_TICK = db.Column(db.String(14))
    SOH = db.Column(db.String(45))

    lean = db.relationship(u'Lean')


class SysGroup(db.Model):
    __tablename__ = 'sys_group'

    GROUP_ID = db.Column(db.String(45), primary_key=True)
    GROUP_NAME = db.Column(db.String(45), nullable=False)
    CREATE_TIME = db.Column(db.String(45), nullable=False)
    CREATE_BY = db.Column(db.String(100), nullable=False)
    MODIFY_TIME = db.Column(db.String(45), nullable=False)
    MODIFY_BY = db.Column(db.String(100), nullable=False)
    MANAGER = db.Column(db.Integer, nullable=False)

    sys_user = db.relationship(u'SysUser', secondary='sys_user_group')


class SysUser(db.Model):
    __tablename__ = 'sys_user'

    USER_ID = db.Column(db.String(45), primary_key=True)
    USER_PWD = db.Column(db.String(45), nullable=False)
    USER_NAME = db.Column(db.String(45), nullable=False)
    USER_EMAIL = db.Column(db.String(100))
    USER_PHONE = db.Column(db.String(30))
    USER_ADDRESS = db.Column(db.String(200))
    USER_VALID = db.Column(db.Integer, nullable=False)
    PWD_ERROR_COUNT = db.Column(db.Integer, nullable=False)
    CREATE_TIME = db.Column(db.String(45), nullable=False)
    CREATE_BY = db.Column(db.String(100), nullable=False)
    MODIFY_TIME = db.Column(db.String(45), nullable=False)
    MODIFY_BY = db.Column(db.String(100), nullable=False)


t_sys_user_group = db.Table(
    'sys_user_group', metadata,
    db.Column('USER_ID', db.ForeignKey(u'sys_user.USER_ID'), primary_key=True, nullable=False, index=True),
    db.Column('GROUP_ID', db.ForeignKey(u'sys_group.GROUP_ID'), primary_key=True, nullable=False, index=True)
)


class TestReceiveRecord(db.Model):
    __tablename__ = 'test_receive_record'

    RECEIVE_ID = db.Column(db.Integer, primary_key=True)
    RECEIVE_TIME = db.Column(db.String(14), nullable=False)
    RECEIVE_CONTENT = db.Column(db.Text, nullable=False)
    LEAN_ID = db.Column(db.String(45), nullable=False)
    DEVICE_ID = db.Column(db.String(45), nullable=False)
    COMMAND_NAME = db.Column(db.String(45), nullable=False)
