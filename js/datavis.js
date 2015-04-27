"use strict";

//initialize app
var App = function () {
	var self = this

	self.active = null

	self.initVis(function(items) { 
		return items.sort(self.sortLoc)
	})

	self.createGroupBtns()
	self.createLegend()
	self.createSortBtns(['sortLoc', 'sortName'])
}

//sorting functions
App.prototype.sortLoc = function(a,b) {
	if (App.data[a].Location > App.data[b].Location)
		return 1
	if (App.data[a].Location < App.data[b].Location)
		return -1
	return 0
}
App.prototype.sortName = function(a,b) {
	if (a > b) return 1
	if (a < b) return -1
	return 0 
}

//initialize visualization
App.prototype.initVis = function (sortCB) {
	var self = this,
			data = App.data

	self.labels = Object.keys(data)
	self.people = {}
	self.groups = {}
	self.locs = Object.keys(App.color)
	//sort labels by passed rule
	sortCB ? self.labels = sortCB(self.labels) : null ;
	//store all data by label in app.people
	self.labels.forEach(function(label) {
		self.people[label] = new Person(data[label])
	})
	//store data by project (group) in app.groups
	for (var key in data[self.labels[0]]) {
		if (key.match(/^\d\w$/))
			self.groups[key] = new Group(key, self.name)
	}
	
	self.createVis()
	//check if a group or person has been clicked
	if (self.active) {
		//keep okr group active
		if (self.groups.hasOwnProperty(self.active)) {
			//mimic button click
			(function activateGroup() {
				var btn = d3.select('.btn-'+self.active),
						grp = self.groups[self.active]
				btn.on('click')()
			})()
		}//keep person active
		else if (self.labels.indexOf(self.active) != -1) {
			(function activatePerson() {
				var index = self.labels.indexOf(self.active)
				self.active = d3.select(d3.selectAll('.person')[0][index])
				var pData = self.active.data()[0]
				//mimic clicking on person
				self.active.on('click')(pData, index)
			})()
		}
		
	}
}

//create a matrix of connections between people, for D3
App.prototype.setMatrix = function (people) {
	var self = this,
			matrix = []
	//each person has a row
	self.labels.forEach(function(row) {
		var thisRow = []
		//each person has a column
		self.labels.forEach(function(col) {	
			var i = 0
			// count groups in common bw row & col people
			people[col].groups.forEach(function (g) {
				if (people[row].groups.indexOf(g) !== -1
					&& row !== col) i++
			})
			//push connections to row cell
			thisRow.push(i)
		})
		//push rows to matrix
		matrix.push(thisRow)
	})
	return matrix
}

App.prototype.createVis = function () {
	var self = this,
			outerR = 100 / 2.5,
			innerR = outerR - 2

	var arc = d3.svg.arc()
				.innerRadius(innerR)
				.outerRadius(outerR)

	var chord = d3.layout.chord()
				.padding(.01)
				.sortSubgroups(d3.descending)
				.sortChords(d3.descending)

	//init chord matrix
	chord.matrix(self.setMatrix(self.people))

	//add loc and color data to chord groups
	chord.groups().forEach(function (g) {
		g.loc = self.people[self.labels[g.index]].loc
		if (g.loc.match(/remote/i)) g.loc = 'Remote'
		g.color = App.color[g.loc]
	})
	//add color data to cords based on average of src and dst
	chord.chords().forEach(function (c) {
		var src = chord.groups()[c.source.index],
				dst = chord.groups()[c.target.index],
				colNumSrc = src.color.match(/[a-f|0-9]{2}/g),
				colNumDst = dst.color.match(/[a-f|0-9]{2}/g),
				result = '#'
		colNumSrc.forEach(function(colSrc, i) {
			var hSrc = parseInt(colSrc, 16), 
					hDst = parseInt(colNumDst[i], 16),
					hex = Math.round((hSrc + hDst)/2).toString(16)
			result += hex.length == 2 ? hex : '0' + hex
		})
		c.color = result
	})
	self.chords = chord.chords().length
	d3.select('.d3-category').text('Big Picture:')
	d3.select('.d3-selection').text('Our Company')
	d3.select('.d3-teams').text(Object.keys(self.people).length + ' teammates')
	d3.select('.d3-connects').text(self.chords + ' connections')

	//remove existing SVG before inserting this one
	d3.select('#d3 svg').remove()
	var svg = d3.select('#d3')
		.append('svg')
			.attr('width', '90%')
			.attr('height', '90%')
			.attr('viewBox', '0 0 100 100')
			.append('g')
				.attr('class', 'int-vis')
				.attr('transform', 'translate(50,50)')

	var g = svg.selectAll('.person')
		.data(chord.groups)
		.enter()
		.append('g')
			.attr('class', 'person')
			.on('click', function(d, i) {
				var g = d3.select(d3.selectAll('.person')[0][i]),
						blocks = d3.selectAll('.person').selectAll('path'),
						chords = d3.select('#d3').selectAll('.chord')
				//show associated chords
				chords.classed('d3-init', false)
					.classed('hidden', function(c) {
						return c.source.index !== i && c.target.index !== i
					})
				//show associated blocks
				blocks.classed('fade', function(c) {
					var result = true
					self.people[self.labels[c.index]].groups.forEach(function(grp) {
						if (self.people[self.labels[i]].groups.indexOf(grp) != -1)
							result = false
					})
					return result
				})
				//show associated groups
				self.people[self.labels[i]].showGroups()
				//disable active group style
				d3.select('.active-okr').classed('active-okr', false)
				//add data to text info (key) section
				d3.select('.d3-category')
					.text('Team Connections:')
				d3.select('.d3-selection')
					.text(Object.keys(self.people)[i])
				d3.select('.d3-teams')
					.text(blocks.length - d3.select('#d3').selectAll('.fade')[0].length - 1 + ' teammates')
				d3.select('.d3-connects')
					.text(d3.select('#d3-btns').selectAll('.member')[0].length + ' OKRs')
				//record chosen person
				d3.select('.active-person').classed('active-person', false)
				g.classed('active-person', true)
				self.active = self.labels[i]
				
			})

	g.append('path')
		.style('fill', function(d) {
			return d.color
		})
		.attr('d', arc)
	g.append('text')
		.each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr("dy", ".35em")
    .attr("transform", function(d) {
      return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")"
        + "translate(" + (innerR + 2.6) + ")"
        + (d.angle > Math.PI ? "rotate(180)" : "");
    })
    .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
		.text(function (d) { 
			return self.labels[d.index] })

	var chords = svg.selectAll('.chord')
		.data(chord.chords)
		.enter()
		.append('path')
			.attr('class', 'chord d3-init')
			.style('fill', function(d) { return d.color })
			.style('stroke', function(d) { return d.color })
			.attr('d', d3.svg.chord().radius(innerR))
	//Add text titles displaying connection info		
	chords.append('title').text(function(d, i) {
		var srcPerson = self.people[self.labels[d.source.index]],
				dstPerson = self.people[self.labels[d.target.index]],
				connex = 0,
				grp = []
		//count number of group connections between two people
		srcPerson.groups.forEach(function (g) {
			if (dstPerson.groups.indexOf(g) !== -1) {
				connex++
				grp.push(g)
			}
		})
		//write connection info to text title
		return srcPerson.name + ' + ' + dstPerson.name + '\n' +
						connex + ' connections:\nGroup ' + grp.join(', ')
	})
}

//create group buttons
App.prototype.createGroupBtns = function () {
	var self = this,
			btns = d3.select('#d3-btns')
				
	//add reset button, reset styles
	btns.selectAll('div').remove()
	btns.append('div')
		.attr('class', 'btn clear')
		.text('Show All')
		.on('click', function() {
			d3.selectAll('.hidden')
				.classed('hidden', false)
			d3.selectAll('.fade')
				.classed('fade', false)
			d3.select('#d3').selectAll('.chord')
				.classed('d3-init', true)
			d3.selectAll('.member')
				.classed('member', false)
			d3.selectAll('.active-okr')
				.classed('active-okr', false)
			//add text data to key
			d3.select('.d3-category')
				.text('Big Picture:')
			d3.select('.d3-selection')
				.text('Our Company')
			d3.select('.d3-teams')
				.text(Object.keys(self.people).length + ' teammates')
			d3.select('.d3-connects')
					.text(self.chords + ' connections')
			//record lack of selection
			self.active = null
		})
	//add button for each group
	btns.selectAll('h4').remove()
	for (var gSuper in App.groupNames) {
		var prime = App.groupNames[gSuper]
		//add title to buttons
		btns.append('h4')
			.text(gSuper+'. '+prime.title)
		//add buttons
		for (var gSub in prime) {
			if (gSub != 'title') {
				var btn = btns.append('div')
					.attr('class', 'btn btn-'+gSuper+gSub)
					.text(prime[gSub])
					//connect button to visualization
				self.connectBtn(self.groups[gSuper+gSub], btn)
			}
		}
	}

}

App.prototype.connectBtn = function(grp, btn) {
	var self = this

	btn.on('click', function() {
		var group = btn.node().className.match(/(\d)(\w)/),
				blocks = d3.selectAll('.person').selectAll('path'),
				chords = d3.selectAll('svg .chord')
					.classed('d3-init', false),
				membership = d3.selectAll('.member')
					.classed('member', false)
		//highlight this button
		d3.select('.active-okr').classed('active-okr', false)
		d3.select(btn.node()).classed('active-okr', true)
		grp.people.forEach(function(person) {	
			//show associated chords
			chords.classed('hidden', function(c) {
				return grp.people.indexOf(self.labels[c.source.index]) == -1 ||
							 grp.people.indexOf(self.labels[c.target.index]) == -1
			})
			//show associated blocks
			blocks.classed('fade', function(c) {
				return grp.people.indexOf(self.labels[c.index]) == -1
			})
		})
		//populate key
		d3.select('.d3-category')
			.text(App.groupNames[group[1]].title+':')
		d3.select('.d3-selection')
			.text(btn.node().innerHTML)
		d3.select('.d3-teams')
			.text(blocks.length - d3.select('#d3').selectAll('.fade')[0].length + ' teammates')
		d3.select('.d3-connects')
			.text(chords[0].length - d3.select('#d3').selectAll('.hidden')[0].length + ' connections')
		//record selected button
		self.active = grp.group
	})

	
}

App.prototype.createLegend = function () {
	var self = this,
			legend = d3.select('#d3-legend')
	//clear any duplicates
	legend.selectAll('li').remove()
	//write title
	legend.append('li')
		.append('p')
		.text('LEGEND')
	//write titles with color swatches
	self.locs.forEach(function(loc) {
		var li = legend.append('li')
		li.append('div')
			.attr('class', 'swatch')
			.attr('style', 'background-color: '+App.color[loc])
		li.append('p')
			.text(loc)
	})
}

App.prototype.createSortBtns = function (options) {
	var self = this,
			container = d3.select('#d3-sort'),
			titles = {"sortLoc": "Geography", 
				"sortName": "Alphabetical" }

	// avoid duplicate btns
	container.selectAll('li').remove()

	options.forEach(function(type) {
		container.append('li')
			.attr('data-sort', titles[type])
			.text(titles[type])
			.on('click', function() {
				if (d3.select(this).classed('active-btn'))
					return
				self.initVis(function(items) { 
					return items.sort(self[type])
				})
				d3.select('#d3-sort').selectAll('li')
					.classed('active-btn', function() {
						return d3.select(this).attr('data-sort') == titles[type]
					})
			})
	})
	if (container.select('.active-btn').node() === null)
		container.select('[data-sort="'+titles[options[0]]+'"]')
			.classed('active-btn', true)

}

//pass data for an individual
var Person = function (data) {
	var self = this
	//set name, location, and array of groups assoc w person
	self.name = data.Name
	self.loc = data.Location
	self.groups = self.setGroups(data)

}
//create an array of groups person is assoc w
Person.prototype.setGroups = function (data) {
	var self = this,
			groups = []

	for (var k in data) {
		if (k.match(/^\d\w$/) && data[k]) groups.push(k)
	}
	return groups
}

Person.prototype.showGroups = function () {
	var self = this,
			buttons = d3.select('#d3-btns').selectAll('.btn')
	//add class to associated group btns, remove from unassociated
	buttons.classed('member', function(d, i) {
		var button = this
		return self.groups.filter(function(group) {
			return d3.select(button).classed('btn-'+group)
		}).length

	})
	
}

//create reference by group
var Group = function (grp) {
	var self = this

	self.group = grp
	self.locs = []
	self.people = []

	for (var i in App.data) {
		if (App.data[i][grp]) {
			self.people.push(i)
			if (self.locs.indexOf(App.data[i].Location) == -1)
				self.locs.push(App.data[i].Location)
		}
	}

}


