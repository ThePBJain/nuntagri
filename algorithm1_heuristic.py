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
    def __init__(self, appointments_list, job_hash, job_list):
        self.appointments_list = appointments_list
        self.job_hash = job_hash
        self.job_list = job_list

    def display_appointment_list(self):
        print("Number of windows missed :" + str(self.find_number_windows_missed()))
        print("Cumulative miss time: "+ str(self.find_cumulative_miss_time()))
        print("-----------------------------")
        for a in self.appointments_list:
            print("Job ID: " + a.jobID)
            print("Location: " + str(a.location))
            print("Window Requested: " + str(a.window))
            print("Amount loaded: " + str(a.amount_loaded))
            print("Load time: " + str(a.load_time))
            print("Truck remaining capacity: " + str(a.remaining_capacity))
            print("Arrival: " + str(a.appointment_start))
            print("Departure: " + str(a.appointment_end))
            print("-----------------------------")
        print("Number of windows missed :" + str(self.find_number_windows_missed()))
        print("Cumulative miss time: "+ str(self.find_cumulative_miss_time()))

    def find_number_windows_missed(self):
        count = 0
        for a in self.appointments_list:
            if a.appointment_end > a.window[1]:
                count = count + 1
        return count

    def find_cumulative_miss_time(self):
        miss_time = 0
        for a in self.appointments_list:
            if a.appointment_end > a.window[1]:
                miss_time = miss_time + (a.appointment_end - a.window[1])
        return miss_time


class Appointment:
    def __init__(self, appointment_start, appointment_end , job_ID, location, window, amount_loaded, load_time, remaining_capacity):
        self.appointment_start  = appointment_start
        self.appointment_end = appointment_end
        self.jobID = job_ID
        self.location = location
        self.window = window
        self.amount_loaded = amount_loaded
        self.load_time = load_time
        self.remaining_capacity = remaining_capacity


def make_schedule(driver, truck, depot, dump, jobList, start_time, start_pos, starting_load):
    all_possible_orderings = create_orderings(jobList)
    """need to add the time to get to/from depot at beginning/end of day, and maybe last dump at end of day"""
    j_hash = {}
    for j in jobList:
        j_hash[j.jobID] = j
    winning_order_index = evaluate_cost_of_all_orderings(all_possible_orderings, truck, depot, dump, j_hash, start_time, start_pos, starting_load)
    winning_order = all_possible_orderings[winning_order_index]
    appointmentList = make_appointment_list(winning_order, driver, truck, depot, dump, j_hash, start_time, start_pos, starting_load)
    schedule = Schedule(appointmentList, j_hash, jobList)
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


def evaluate_cost_of_all_orderings(all_possible_orderings, truck, depot, dump, j_hash, start_time, start_pos, starting_load):
    costs = []
    for ordering in all_possible_orderings:
        costs.append(cost_of_an_ordering(ordering, truck, depot, dump, j_hash, start_time, start_pos, starting_load))
    min_index = 0
    for i in range(1, len(costs)):
        """
        print(costs[i])
        """
        if costs[i] < costs[min_index]:
            min_index = i
    return min_index


def cost_of_an_ordering(ordering, truck, depot, dump, j_hash, start_time, start_pos, starting_load):
    cost = 0 #cost is driving time + stiff penalties for missing time window
    time = start_time
    if(len(ordering)) == 0:
        return cost
    truck.remainingCapacity = truck.maxCapacity - starting_load
    current_pos = start_pos
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
            cost = cost+100 * (time - j_hash[id].window[1])
    driving_time = cost
    return driving_time


def make_appointment_list(ordering, driver, truck, depot, dump, j_hash, start_time, start_pos, starting_load):
    appointmentList = []
    cost = 0  # cost is driving time + stiff penalties for missing time window
    time = start_time  # driver's start time
    if (len(ordering)) == 0:
        return cost
    truck.remainingCapacity = truck.maxCapacity - starting_load
    current_pos = start_pos
    for id in ordering:
        if truck.remainingCapacity - j_hash[id].amount < 0:
            # need to adjust cost to account for time to travel to dump, the time to unload the truck(.25), and then the time to drive to next job, and time to load next job
            cost = cost + (distance(current_pos, dump.location)) / 60.0
            time = time + (distance(current_pos, dump.location)) / 60.0 + .25
            amount_dumped = truck.maxCapacity - truck.remainingCapacity
            truck.remainingCapacity = truck.maxCapacity
            temp = Appointment(time-.25, time, "Dump", dump.location, (-1000, 1000), -1 * amount_dumped, .25, truck.remainingCapacity)
            appointmentList.append(temp)
            cost = cost + (distance(dump.location, j_hash[id].location)) / 60.0
            """if we get to the job before the window starts"""
            if time < j_hash[id].window[0]:
                time = j_hash[id].window[0]
            time = time + j_hash[id].loadTime
            truck.remainingCapacity = truck.remainingCapacity - j_hash[id].amount
            temp = Appointment(time - j_hash[id].loadTime, time, str(id), j_hash[id].location, j_hash[id].window, j_hash[id].amount, j_hash[id].loadTime, truck.remainingCapacity)
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
            temp = Appointment(time - j_hash[id].loadTime, time, str(id), j_hash[id].location, j_hash[id].window, j_hash[id].amount, j_hash[id].loadTime,  truck.remainingCapacity)
            appointmentList.append(temp)
        current_pos = j_hash[id].location
        """if we didn't finish the job in the window"""
        if time > j_hash[id].window[1]:
            cost = cost + 100

    driving_time = cost
    return appointmentList


def try_to_dynamically_insert_job(driver, truck, depot, dump, schedule, new_job, query_time):

    ###########potential bug: what if there are no jobs before or after the job being inserted....
    print("INFO ON THE DYNAMIC INSERTION REQUEST")
    print("Query was made at: "+str(query_time))
    unfulfilled_jobIDs = []
    al = schedule.appointments_list #ordered list of original appointments
    al_previous_jobID = 0
    al_previous_job_index = 0
    for a in range(0, len(al)):
        if al[a].jobID != "Dump":
            if query_time <= al[a].appointment_start:
                unfulfilled_jobIDs.append(int(al[a].jobID))
                print(al[a].jobID + " is a remaining job")
            #else: current_time > al[a].start
            else:
                al_previous_job_index = a
                al_previous_jobID = int(al[a].jobID)
                print(al[a].jobID + " has already passed or been started")



    print(str(new_job.jobID)+ " is the job we are trying to dynamically insert")

    j_hash = schedule.job_hash
    j_hash[new_job.jobID] = new_job

    unfulfilled_jobIDs.append(new_job.jobID)
    for i in unfulfilled_jobIDs:
        print(str(i) + " is in the unfulfilled jobIDs list")

    unfulfilled_jobs_list = []
    for jobID in unfulfilled_jobIDs:
        unfulfilled_jobs_list.append(j_hash[jobID])

    print(str(al_previous_jobID) + " is the first previous job")

    #if the first previous job from the query time is not over
    if query_time <= al[al_previous_job_index].appointment_end:
        print("We were in the middle of job "+str(al_previous_jobID)+ " when the query came in")
        t_available = al[al_previous_job_index].appointment_end
        start_pos = al[al_previous_job_index].location
        start_load = truck.maxCapacity - al[al_previous_job_index].remaining_capacity
    #else start the new schedule with the next apointment
    else:
        print("We were already on our way to job " + al[al_previous_job_index+1].jobID+" when the query came in")
        t_available = al[al_previous_job_index+1].appointment_start
        start_pos =  al[al_previous_job_index+1].location
        start_load = truck.maxCapacity - (al[al_previous_job_index].remaining_capacity)
    print("We will start our schedule at: ")
    print("Time: " + str(t_available))
    print("Position: "+ str(start_pos))
    print("Load: " + str(start_load))

    new_schedule = make_schedule(driver, truck, depot, dump, unfulfilled_jobs_list, t_available, start_pos, start_load)
    print("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
    print("SCHEDULE WITH THE DYNAMIC INSERTION: ")
    new_schedule.display_appointment_list()
    print("vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv")
    if new_schedule.find_number_windows_missed() > schedule.find_number_windows_missed() or new_schedule.find_cumulative_miss_time() > schedule.find_cumulative_miss_time():
        print("Unable to insert new job.  returning old schedule.")
        return schedule
    else:
        print("New job inserted successfully.  returning new schedule with upcoming jobs from old schedule and the dynamically inserted job.")
        return new_schedule
