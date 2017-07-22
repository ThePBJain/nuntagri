import itertools
import math


class Job:
    #note: jobID are positive integers
    def __init__(self, jobID, location, amount, window, loadTime):
        self.jobID = jobID
        self.location = location
        self.amount = amount
        self.window = window
        self.loadTime = loadTime


class JobList:
    def __init__(self, jl):
        self.jl = jl
    def display(self):
        for x in self.jl:
            print (x.jobID)


class Driver:
    def __init__ (self, driverID, queue, currentLocation, startTime):
        self.driverID = driverID
        self.queue = queue
        self.currentLocation = currentLocation
        self.startTime = startTime


class Truck:
    def __init__(self, truckID, maxCapacity, remainingCapacity):
        self.truckID= truckID
        self.maxCapacity = maxCapacity
        self.remainingCapacity = remainingCapacity


class Dump:
    def __init__(self, location):
        self.location = location


class Depot:
    def __init__(self, location):
        self.location = location


class Schedule:
    def __init__(self, appointments_list):
        self.appointments_list = appointments_list

    def display_appointment_list(self):
        for a in self.appointments_list:
            print("Job ID: " + a.jobID)
            print("Location: " + str(a.location))
            print("Window Requested: " + str(a.window))
            print("Amount loaded: " + str(a.amount_loaded))
            print("Truck remaining capacity: " + str(a.remaining_capacity))
            print("Arrival: " + str(a.appointment_start))
            print("Departure: " + str(a.appointment_end))
            print("-----------------------------")


class Appointment:
    #note: jobID 0 will reference the depot, jobID -1 will reference the dump
    def __init__(self, appointment_start, appointment_end , job_ID, location, window, amount_loaded, remaining_capacity):
        self.appointment_start  = appointment_start
        self.appointment_end = appointment_end
        self.jobID = job_ID
        self.location = location
        self.window = window
        self.amount_loaded = amount_loaded
        self.remaining_capacity = remaining_capacity


def make_schedule(driver, truck, depot, dump, jobList):
    all_possible_orderings = create_orderings(jobList)
    """need to add the time to get to/from depot at beginning/end of day, and maybe last dump at end of day"""
    j_hash = {}
    for j in jobList:
        j_hash[j.jobID] = j
    winning_order_index = evaluate_cost_of_all_orderings(all_possible_orderings, truck, depot, dump, jobList, j_hash)
    winning_order = all_possible_orderings[winning_order_index]
    appointmentList = make_appointment_list(winning_order, driver, truck, depot, dump, j_hash)
    schedule = Schedule(appointmentList)
    return schedule


def create_orderings(jobList):
    j_8_10 = []
    j_10_12 = []
    j_12_14 = []
    j_14_16 = []
    j_16_18 = []
    for job in jobList:
        if job.window[0] == 8:
            j_8_10.append(job.jobID)
        elif job.window[0] == 10:
            j_10_12.append(job.jobID)
        elif job.window[0] == 12:
            j_12_14.append(job.jobID)
        elif job.window[0] == 14:
            j_14_16.append(job.jobID)
        elif job.window[0] == 16:
            j_16_18.append(job.jobID)
    p_o_8_10 = list(itertools.permutations(j_8_10))
    p_o_10_12 = list(itertools.permutations(j_10_12))
    p_o_12_14 = list(itertools.permutations(j_12_14))
    p_o_14_16 = list(itertools.permutations(j_14_16))
    p_o_16_18 = list(itertools.permutations(j_16_18))

    all_possible_orderings = []
    for o1 in p_o_8_10:
        for o2 in p_o_10_12:
            for o3 in p_o_12_14:
                for o4 in p_o_14_16:
                    for o5 in p_o_16_18:
                        all_possible_orderings.append(o1+o2+o3+o4+o5)
    return all_possible_orderings


def distance(p1, p2):
    return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)


def evaluate_cost_of_all_orderings(all_possible_orderings, truck, depot, dump, jobList, j_hash):
    costs = []
    for ordering in all_possible_orderings:
        costs.append(cost_of_an_ordering(ordering, truck, depot, dump, j_hash))
    min_index = 0
    for i in range(1, len(costs)):
        """
        print(costs[i])
        """
        if costs[i] < costs[min_index]:
            min_index = i
    return min_index


def cost_of_an_ordering(ordering, truck, depot, dump, j_hash):
    cost = 0 #cost is driving time + stiff penalties for missing time window
    time = 8 #driver's start time
    if(len(ordering)) == 0:
        return cost
    truck.remainingCapacity = truck.maxCapacity
    current_pos = depot.location
    for id in ordering:
        if truck.remainingCapacity - j_hash[id].amount < 0:
            # need to adjust cost to account for time to travel to dump, the time to unload the truck(.25), and then the time to drive to next job, and time to load next job
            cost = cost + (distance(current_pos, dump.location)) / 60.0
            time = time + (distance(current_pos, dump.location)) / 60.0 + .25
            amount_dumped = truck.maxCapacity - truck.remainingCapacity
            truck.remainingCapacity = truck.maxCapacity
            cost = cost + (distance(dump.location, j_hash[id].location)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
        # if the truck can hold the next load, need to ajust cost to account for time to travel to next job, and time to load next job
        else:
            #
            cost = cost + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            """
            print(id)
            print("load time: " + str(j_hash[id].loadTime))
            print("load amount: "+ str(j_hash[id].amount))
            print("cummulative cost: " + str(cost))
            print("capacity remaining: " + str(truck.remainingCapacity))
            print("current time: "+ str(time))
            """
        current_pos = j_hash[id].location
        """if we didn't finish the job in the window"""
        if time > j_hash[id].window[1]:
            cost = cost+100
    driving_time = cost
    return driving_time


def cost_of_an_ordering2(ordering, truck, depot, dump, j_hash):
    cost = 0 #cost is driving time + stiff penalties for missing time window
    time = 8 #driver's start time
    if(len(ordering)) == 0:
        return cost
    truck.remainingCapacity = truck.maxCapacity
    current_pos = depot.location
    print(ordering)
    print("current capacity: " + str(truck.remainingCapacity))
    print("current cost: " + str(cost))
    for id in ordering:
        if truck.remainingCapacity - j_hash[id].amount < 0:
            # need to adjust cost to account for time to travel to dump, the time to unload the truck(.25), and then the time to drive to next job, and time to load next job
            cost = cost + (distance(current_pos, dump.location)) / 60.0
            time = time + (distance(current_pos, dump.location)) / 60.0 + .25
            amount_dumped = truck.maxCapacity - truck.remainingCapacity
            truck.remainingCapacity = truck.maxCapacity
            print("**DUMP**")
            print("unload time: " + str(.25))
            print("unload amount: " + str(amount_dumped))
            print("cummulative cost: " + str(cost))
            print("capacity remaining: " + str(truck.remainingCapacity))
            print("current time: "+ str(time))
            cost = cost + (distance(dump.location, j_hash[id].location)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            #
            print(id)
            print("load time: " + str(j_hash[id].loadTime))
            print("load amount: "+ str(j_hash[id].amount))
            print("cummulative cost: " + str(cost))
            print("capacity remaining: " + str(truck.remainingCapacity))
            print("current time: " + str(time))
        # if the truck can hold the next load, need to ajust cost to account for time to travel to next job, and time to load next job
        else:
            #
            cost = cost + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            print(id)
            print("load time: " + str(j_hash[id].loadTime))
            print("load amount: "+ str(j_hash[id].amount))
            print("cummulative cost: " + str(cost))
            print("capacity remaining: " + str(truck.remainingCapacity))
            print("current time: "+ str(time))
        current_pos = j_hash[id].location

        """if we didn't finish the job in the window"""
        if time > j_hash[id].window[1]:
            cost = cost+100

    driving_time = cost
    return driving_time


def make_appointment_list(ordering, driver, truck, depot, dump, j_hash):
    appointmentList = []
    start_current_appt = -1
    end_current_appt =-1
    job_id = " "
    cost = 0  # cost is driving time + stiff penalties for missing time window
    time = 8  # driver's start time
    if (len(ordering)) == 0:
        return cost
    truck.remainingCapacity = truck.maxCapacity
    current_pos = depot.location
    for id in ordering:
        if truck.remainingCapacity - j_hash[id].amount < 0:
            # need to adjust cost to account for time to travel to dump, the time to unload the truck(.25), and then the time to drive to next job, and time to load next job
            cost = cost + (distance(current_pos, dump.location)) / 60.0
            time = time + (distance(current_pos, dump.location)) / 60.0 + .25
            amount_dumped = truck.maxCapacity - truck.remainingCapacity
            truck.remainingCapacity = truck.maxCapacity
            temp = Appointment(time-.25, time, "Dump", dump.location, (-1, -1), -1 * amount_dumped, truck.remainingCapacity)
            appointmentList.append(temp)
            cost = cost + (distance(dump.location, j_hash[id].location)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            temp = Appointment(time - j_hash[id].loadTime, time, str(id), j_hash[id].location, j_hash[id].window, j_hash[id].amount, truck.remainingCapacity)
            appointmentList.append(temp)

        # if the truck can hold the next load, need to ajust cost to account for time to travel to next job, and time to load next job
        else:
            #
            cost = cost + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime + (distance(j_hash[id].location, current_pos)) / 60.0
            """if we get to the job before the window starts"""
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            temp = Appointment(time - j_hash[id].loadTime, time, str(id), j_hash[id].location, j_hash[id].window, j_hash[id].amount, truck.remainingCapacity)
            appointmentList.append(temp)
        current_pos = j_hash[id].location
        """if we didn't finish the job in the window"""
        if time > j_hash[id].window[1]:
            cost = cost + 100

    driving_time = cost
    return appointmentList

"""test data"""
a = Job(1, (0, 30),  5, (12,14), .5)
b = Job(2, (15, 2),  2, (12,14), .25)
c = Job(3, (9, 9),  7, (10,12), .75)
d = Job(4, (0, 30),  1, (14,16), .25)
e = Job(5, (17, -1),  5, (10,12), .5)
f = Job(6, (3, 9), 5, (8, 10), .5)
g = Job(7, (0, 29), 1, (12,14), .125)
h = Job(8, (11, 11), 1, (10,12), .125)
i = Job(9, (1, -2), 7, (16, 18), .75)

joli = JobList([a,b,c,d,e,f,g, h, i])
driver = Driver(1, [], (0,0), 8)
truck = Truck(1, 25, 25)
dump = Dump((12, 12))
depot = Depot((0,0))

hash = {}
for jo in joli.jl:
    hash[jo.jobID] = jo


#generate all possible orderings
apo = create_orderings(joli.jl)
"""
for o in apo:
    print(o)
"""

#test the cost of an arbitrary ordering
#with output
"""
cost_of_an_ordering2((6, 5, 3, 8, 7, 1, 2, 4), truck, depot, dump, hash)
"""
#without output
"""
print("cost of ordering 4")
print(cost_of_an_ordering((6, 3, 5, 8, 7, 1, 2, 4), truck, depot, dump, hash))
"""

#looking at all the costs
costs = []
for ordering in apo:
    costs.append(cost_of_an_ordering(ordering, truck, depot, dump, hash))
min_index = 0
for i in range(1, len(costs)):
    """
    print(costs[i])
    """
    if costs[i] < costs[min_index]:
            min_index = i
"""
for cost in costs:
    print(cost)
"""
"""
print(min_index)
"""

#selecting winning ordering



#making schedule
sched = make_schedule(driver, truck, depot, dump, joli.jl)
sched.display_appointment_list()
