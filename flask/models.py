# coding: utf-8
from sqlalchemy import Column, ForeignKey, Integer, String, Table, Text, text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()
metadata = Base.metadata


class Battery(Base):
    __tablename__ = 'battery'

    BATTERY_ID = Column(Integer, primary_key=True)
    BATTERY_TYPE_ID = Column(String(100), nullable=False, index=True)
    BATTERY_NAME = Column(String(100), nullable=False)

    car = relationship(u'Car', secondary='battery_sys_car')


t_battery_sys_car = Table(
    'battery_sys_car', metadata,
    Column('BATTERY_ID', ForeignKey(u'battery.BATTERY_ID'), primary_key=True, nullable=False),
    Column('CAR_ID', ForeignKey(u'car.CAR_ID'), primary_key=True, nullable=False, index=True)
)


class BatterySysUser(Base):
    __tablename__ = 'battery_sys_user'

    BATTERY_ID = Column(Integer, primary_key=True)
    USER_ID = Column(String(45), nullable=False, index=True)


class BatteryType(Base):
    __tablename__ = 'battery_type'

    battery_type_id = Column(String(100), primary_key=True)
    battery_type_name = Column(String(100), nullable=False)
    battery_capacity = Column(String(30), nullable=False)
    battery_voltage = Column(String(30), nullable=False)


class Car(Base):
    __tablename__ = 'car'

    CAR_ID = Column(Integer, primary_key=True)
    CAR_NAME = Column(String(50), nullable=False)
    CAR_TYPE_ID = Column(ForeignKey(u'car_type.CAR_TYPE_ID'), nullable=False, index=True)
    CAR_NUMBER = Column(String(50), nullable=False)
    BUY_TIME = Column(String(45), nullable=False)

    car_type = relationship(u'CarType')
    sys_user = relationship(u'SysUser', secondary='car_sys_user')
    lean = relationship(u'Lean', secondary='car_lean')


t_car_lean = Table(
    'car_lean', metadata,
    Column('CAR_ID', ForeignKey(u'car.CAR_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False),
    Column('LEAN_ID', ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False, index=True)
)


t_car_sys_user = Table(
    'car_sys_user', metadata,
    Column('CAR_ID', ForeignKey(u'car.CAR_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False),
    Column('USER_ID', ForeignKey(u'sys_user.USER_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False, index=True)
)


class CarType(Base):
    __tablename__ = 'car_type'

    CAR_TYPE_ID = Column(String(50), primary_key=True)
    CAR_TYPE_NAME = Column(String(100), nullable=False)
    CAR_BRAND = Column(String(100), nullable=False)


class Lean(Base):
    __tablename__ = 'lean'

    LEAN_ID = Column(String(10), primary_key=True, server_default=text("''"))
    DESCRIPTION = Column(String(100))


class Rc(Base):
    __tablename__ = 'rc'

    LEAN_ID = Column(ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False)
    PROCESS_TICK = Column(String(14), primary_key=True, nullable=False, server_default=text("''"))
    RC_INDEX = Column(String(45), nullable=False)

    lean = relationship(u'Lean')


class Soc(Base):
    __tablename__ = 'soc'

    LEAN_ID = Column(ForeignKey(u'lean.LEAN_ID', ondelete=u'CASCADE', onupdate=u'CASCADE'), primary_key=True, nullable=False)
    PROCESS_TICK = Column(String(14), primary_key=True, nullable=False)
    MINUTES_OF_DRIVING = Column(String(45))
    DISTANCES_OF_DRIVING = Column(String(45))
    SOC = Column(String(45))
    DRIVING_BEHAVIOR = Column(String(45))
    TIMES_TO_EMPTY_AGGRESSIVE = Column(String(45))
    TIMES_TO_EMPTY_MODERATE = Column(String(45))
    TIMES_TO_EMPTY_ECONOMIC = Column(String(45))
    DISTANCES_TO_EMPTY_AGGRESSIVE = Column(String(45))
    DISTANCES_TO_EMPTY_MODERATE = Column(String(45))
    DISTANCES_TO_EMPTY_ECONOMIC = Column(String(45))
    ENERGY_CONSUMPTION_RATE = Column(String(45))
    START_TICK = Column(String(14))
    SOH = Column(String(45))

    lean = relationship(u'Lean')


class SysGroup(Base):
    __tablename__ = 'sys_group'

    GROUP_ID = Column(String(45), primary_key=True)
    GROUP_NAME = Column(String(45), nullable=False)
    CREATE_TIME = Column(String(45), nullable=False)
    CREATE_BY = Column(String(100), nullable=False)
    MODIFY_TIME = Column(String(45), nullable=False)
    MODIFY_BY = Column(String(100), nullable=False)
    MANAGER = Column(Integer, nullable=False)

    sys_user = relationship(u'SysUser', secondary='sys_user_group')


class SysUser(Base):
    __tablename__ = 'sys_user'

    USER_ID = Column(String(45), primary_key=True)
    USER_PWD = Column(String(45), nullable=False)
    USER_NAME = Column(String(45), nullable=False)
    USER_EMAIL = Column(String(100))
    USER_PHONE = Column(String(30))
    USER_ADDRESS = Column(String(200))
    USER_VALID = Column(Integer, nullable=False)
    PWD_ERROR_COUNT = Column(Integer, nullable=False)
    CREATE_TIME = Column(String(45), nullable=False)
    CREATE_BY = Column(String(100), nullable=False)
    MODIFY_TIME = Column(String(45), nullable=False)
    MODIFY_BY = Column(String(100), nullable=False)


t_sys_user_group = Table(
    'sys_user_group', metadata,
    Column('USER_ID', ForeignKey(u'sys_user.USER_ID'), primary_key=True, nullable=False, index=True),
    Column('GROUP_ID', ForeignKey(u'sys_group.GROUP_ID'), primary_key=True, nullable=False, index=True)
)


class TestReceiveRecord(Base):
    __tablename__ = 'test_receive_record'

    RECEIVE_ID = Column(Integer, primary_key=True)
    RECEIVE_TIME = Column(String(14), nullable=False)
    RECEIVE_CONTENT = Column(Text, nullable=False)
    LEAN_ID = Column(String(45), nullable=False)
    DEVICE_ID = Column(String(45), nullable=False)
    COMMAND_NAME = Column(String(45), nullable=False)
