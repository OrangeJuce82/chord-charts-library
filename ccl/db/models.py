from peewee import *

database = SqliteDatabase('db/chord_charts.sqlite')


class UnknownField(object):
    def __init__(self, *_, **__): pass


class BaseModel(Model):
    class Meta:
        database = database


class Chart(BaseModel):
    composer = CharField(null=True)
    data = TextField()
    data_type = CharField()
    style = CharField(null=True)
    title = CharField()
    tone = CharField(null=True)

    class Meta:
        table_name = 'chart'


class SqliteSequence(BaseModel):
    name = BareField(null=True)
    seq = BareField(null=True)

    class Meta:
        table_name = 'sqlite_sequence'
        primary_key = False
