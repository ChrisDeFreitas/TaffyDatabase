# TaffyDatabase (db.js)

TaffyDatabase provides a database/table/row interface using TaffyDB. 
I built it for a project that required Javascript object persistence in the browser
with light database functionality such as storing unique records and fast record filtering. 
The application needs were simple and was used a by small number of people so it didn't warrant 
a large investment of time or brain power.  As a result the changes to TaffyDb are ad hoc, not 
meant or required to be universally applicable.

This repository is a clone of the original TaffyDb repo, https://github.com/typicaljoe/taffydb, with the few files required in the root folder:  
	- db.js: contains TaffyDatabase object  
	- index-dbtest.html: functions to test TaffyDatabase, writes output to Javascript console, no HTML content  
	- taffy.js: modified TabbyDb object  
	- taffy-original.js: unmodified TabbyDb object, provided for reference  
  
##	Notes  
 - the database interface is fairly simple, see db.js for interface, and index-dbtest.html for example code
 - database === array of Taffy()  
 - table === Taffy()  
 - row   === Taffy().get()[n]; a Javascript object  
 - id    === Taffy().get()[n].___id  
 - load/retrieve/store functions use localstorage  
 - all functions taking table name arguments assume the TaffyDatabase.list[name] exists  
	
## Important changes to TaffyDb  
 - code changes in taffy.js have comments with "Chris: ..."  
 - disabled sortArgs() because it causes function args to arrive in unpredictable order  
 - add bSearch(key,val) a binary search algorithm, requires table to be ordered on key  
 - modified insert() to insert record in sorted order  
 - made TOb public via Taffy().getDBI().TOb (required to speed bSearch() )  

