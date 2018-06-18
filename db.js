/*
	db.js
	- by Chris DeFreitas <chrisd@europa.com>
	- provides a database/table/row interface using TaffyDB
	- built for Playa the Youtube Player 

	Important re TaffyDb.js
		TaffyDb.js is broken because of the use of sortArgs() when calling extensions ( Taffy.extend(...) )
		- sortArgs() sorts the argument values passed to the extension so argmuments may arrive in any order
		- sortArgs() disabled in taffy.js
		For many operations Taffy copies its internal data array (TOb) to an array via context()
		- duplicating the data is extremely inefficient
		- the Taffy source code was modified to allow pulic access to the internal data array:
				TaffyDatabase.tableRaw(tablename) calls Taffy().getDBI().TOb
		Not using taffy localstorage functions because it coverts each Taff.get()[n] to json
		- for localstorage, TaffyDatabase converts {key: tableRaw(key)} to json
		TaffyDatabase.rowInsert() does not use taffy.insert() because this applications requirements are very simple
		- rowInsert() inserts a record in sorted order into TOb using Array.splice()
		- Taffy.insert() appends records to TOb
		Changed settings.cacheSize = null;  was 100 - cache adds significant performance hit
		Changed idpad='000000' to idpad =''
		If time permits, fork and update Taffy with these changes, but this application is fairly simple so work-arounds are ok
	
	Notes
	- database === array of Taffy()
	- table === Taffy()
	- row   === Taffy().get()[n]; a Javascript object
	- id    === Taffy().get()[n].___id
	- load/retrieve/store functions use localstorage
	- all functions taking table name arguments assume the TaffyDatabase.list[name] exists
	
	requires:
		the customized taffy.js

*/
"use strict" 

class TaffyDatabase {
	constructor(localStorageName=null){
		this.storageName = (localStorageName!=null ?localStorageName :this.timestamp())
		this.list = {}									//list of TaffyDB tables
		this.version = 0
	}
	get length(){
		return Object.keys( this.list ).length
	}
	open(name, data, settings){	//create or open a table (db in Taffy parlance), return Taffy.query()
		if(settings===undefined) settings = null
		if(data===undefined) data = null
		
		let tb = null
		if(!this[name])  this.list[name] = TAFFY()
		tb = this.list[name]
		if(settings) tb.settings(settings)
		if(data) tb.insert(data)
		return tb		//return Taffy object
	}
	empty(){			//return this
		this.list = {}
		this.version = 0
		return this
	}
	insert(name, data){	//save data to this.list[name], return Taffy.query() pointing to data
		//assume 1: this.list[name] exists
		//assume 2: data is not null
		return this.list[name].insert(data) //return Taffy query pointing to new records
	}
	row(name, id){	//return this.list[name]().filter({__id:id})[0]
		//assume 1: this.list[name] exists
		let tb = this.list[name]
		let qry = tb({'___id': {'===':id}})
		if(qry === null) return null
		return qry.get()[0]
	}
	rowDelete(name, id){			//return this
		//assume 1: this.list[name] exists
		//assume 2: id is not null
		let tb = this.list[name]
		tb().filter({'___id':id}).remove()
		//return true
		return this
	}
	rowFind(name, key, val){
		//assume this.list[name] exists
		//assume this.list[] sorted on key: this.list[].sort(key)
		//assume this.list[][key] is fully populated; unpredicatable results with sparse data
		//assume this.list[].length is large enough to warrant the extra code

		//use binary search to find val
		let recs = this.tableRaw(name),
				result = this.table(name)().getDBI().bSearch(recs, key, val)
		if(result.cmp===0)
			return recs[result.idx]
		return null
	}
	rowInsert(name, data, key){	//save data to this.list[name], return ___id
		//assume: this.list[name] exists
		//assume: data is a single object
		//if(key != undefined) insert in sorted order
		let qry = this.list[name].insert(data, false, key)
		//if(data.x===0) debugger
		return qry.get()[0]['___id'] 
	}
	rowUpdate(name, id, data){	//save data to this.list[name], return row[]
		//assume 1: this.list[name] exists
		//assume 2: data is a single object, but tested sccessfully with data === [obj, ...]
		let tb = this.list[name]
		let qry = tb().filter({'___id':id}).update(data)
		return qry.get()[0]
	}
	table(name){		//return this.list[name]
		//assume: this.list[name] exists
		let tb = this.list[name]
		return tb
	}
	tableEmpty(name){		//remove all records, return this
		//assume: name is not null
		//assume: this.list[name] exists
		this.list[name]().remove()
		return this
	}
	tableImport(name, json){	//json to this.list[name], return this
		//assume: name is not null
		//assume: json !== undefined
		let obj= JSON.parse( json ),
				tb = null
		if(json == '') tb = TAFFY()
		else tb = TAFFY( obj )
		this.list[name] = tb				
		return this
	}
	tableIsSorted(name, key){
		//assume sort is ascending: a-z or 0-9
		//for now, use simple comparison
		let recs = this.tableRaw(name),
				lastrow = null
		for(let row of recs){
			if(lastrow === null){
				lastrow = row
				continue
			}
			if(lastrow[key]===undefined || row[key]===undefined){ //key not found, that's ok
				continue
			}
			if(lastrow[key] > row[key]){ //key not found, that's ok
				return false
			}
			lastrow = row
		}
		return true
	}
	tableJSON(name){	//convert this.tableRaw(name) to json, return json
		//assume: this.list[name] exists
		let arr = this.tableRaw(name)
		return JSON.stringify( arr )
	}
	tableRaw(name){		//return TaffyDb's internal array of objects
		//assume: this.list[name] exists
		let tb = this.list[name]
		return tb().getDBI().TOb		//custom modification to TaffyDb code
	}
	tableLoad(name){		//load from localstorage, return this
		//assume: name is not null
		let json = localStorage.getItem( this.storageName+'-'+name )
		return this.tableImport(name, json)		//returns this
	}
	tableStore(name){		//write to localstorage[this.storagename-name], return this
		//assume this[name] exists
		let json = this.tableJSON(name)
		localStorage.setItem( this.storageName+'-'+name, json )
		return this
	}
	export(){				//convert data in this.list[] to json, return json
		let obj = {version:this.version}
		for(let key in this.list){
			//let tb = this.list[key]
			//obj[key] = tb().get()
			obj[key] = this.tableRaw(key)
		}
		return JSON.stringify( obj )
	}
	import(json){		//convert json to this.list data, return this
		this.empty()
		if(json==='' || json==null) return this
		
		let obj = JSON.parse( json )
		this.version = obj.version
		for(let key in obj){
			let tb = TAFFY( obj[key] )
			this.list[key] = tb
		}
		return this
	}
	isStored(){			//is data saved to localStorage, return bool
		return (localStorage.getItem( this.storageName ) !== null)
	}
	store(){				//save all tables to localStorage, return this
		let json = this.export()
		localStorage.setItem( this.storageName, json )
		return this
	}
	retrieve(){			//load all tables to localStorage, return this
		let json = localStorage.getItem( this.storageName )
		return this.import(json)		//return this
	}
	//utility functions
	padNumber(value, maxLength) {
		if(maxLength==null) maxLength=2
		if(typeof value != 'string') value=value.toString()
		var padlen = maxLength - value.length
	  if(padlen > 0) value = '0'.repeat(padlen) +value
    return value
	}
	timestamp(adatetime){
		var dt =(adatetime==null
					 ? new Date()
					 : new Date(adatetime))
			, str = `${dt.getFullYear()}${this.padNumber(dt.getUTCMonth()+1, 2)}${this.padNumber(dt.getUTCDate(),2)}`
						+ `-${this.padNumber(dt.getHours(), 2)}${this.padNumber(dt.getMinutes(), 2)}${this.padNumber(dt.getSeconds(), 2)}`
						+ `-${this.padNumber(dt.getMilliseconds(), 3)}`
		return str
	}
}

//test performance of context() vs getDBI().TOb
TAFFY.extend("avg",function (c) {
	// This runs the query or returns the results if it has already run
	//log('this.getDBI()',this.getDBI())

	var total, result;
	
	console.time('context')
	let xx= this.context({
    results: this.getDBI().query(this.context())
  });
  //log('xx',xx)
   total = 0;
   TAFFY.each(this.context().results,function (r) {
   	//log('r[c]', r[c])
   	if(r[c]===undefined) return 0
		total = total + r[c];
   })
  result = total/this.context().results.length;
  //log(result)
	console.timeEnd('context')

	console.time('TOb')
	let arr = this.getDBI().TOb
	total = 0;
	TAFFY.each(arr,function (r) {
		//log('r[c]', r[c])
		if(r[c]===undefined) return
		total = total + r[c];
	})
  result = total/arr.length;
  //log(result)
	console.timeEnd('TOb')
	return 0	//result
})
