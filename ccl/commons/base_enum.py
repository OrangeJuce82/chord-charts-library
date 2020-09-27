from enum import Enum


class BaseEnum(Enum):
    """A very simple BaseEnum class who add method to make enum more friendly"""

    @classmethod
    def has_value(cls, value):
        """Class method for serach value in enum members

        Returns
        -------
        bool : True if value is a member of the enum, False otherwise.
        """
        return value in cls._value2member_map_
