import itertools
import math
import algorithm1_heuristic as ahnd

"""test data"""
a = ahnd.Job(1, (0, 30),  5, (12,14), .5)
b = ahnd.Job(2, (15, 2),  2, (12,14), .25)
c = ahnd.Job(3, (9, 9),  7, (10,12), .75)
d = ahnd.Job(4, (0, 30),  1, (14,16), .25)
e = ahnd.Job(5, (17, -1),  5, (10,12), .5)
f = ahnd.Job(6, (3, 9), 5, (8, 10), .5)
g = ahnd.Job(7, (0, 29), 1, (12,14), .125)
h = ahnd.Job(8, (11, 11), 1, (10,12), .125)
i = ahnd.Job(9, (1, -2), 5, (16, 18), .5)


k = ahnd.Job(10, (1, -3), 1, (16, 18), .25)

joli = ahnd.JobList([a,b,c,d,e,f,g,h, i])
driver = ahnd.Driver(1, [], (0,0), 8)
truck = ahnd.Truck(1, 25, 25)
dump = ahnd.Dump((12, 12))
depot = ahnd.Depot((0,0))


sched1 = ahnd.make_schedule(driver, truck, depot, dump, joli.jl, 7, depot.location, 08.0)
sched1.display_appointment_list()


print("############################")


#sched2 = ahnd.try_to_dynamically_insert_job(driver, truck, depot, dump, sched1, k, 8.8)
#sched2.display_appointment_list()
