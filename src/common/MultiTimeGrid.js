
/* A subclass of AgendaView, it displays an arbitrary number of "agendaDay" views side by side
----------------------------------------------------------------------------------------------------------------------*/

var MultiTimeGrid = fc.MultiTimeGrid = TimeGrid.extend({

	headCellHtml: function(cell) {
		var view = this.view;
		var date = cell.start;


		//----------------------------
		// Added support for custom columns
		//----------------------------
		if($.isArray(this.customColumns) && this.customColumns.length > 0){
			return '' +
				'<th class="fc-day-header ' + view.widgetHeaderClass + ' fc-' + dayIDs[date.day()] + '">' +
				htmlEscape(this.customColumns[cell.col].name) +
				'</th>';
		}else{
			return '' +
				'<th class="fc-day-header ' + view.widgetHeaderClass + ' fc-' + dayIDs[date.day()] + '">' +
				htmlEscape(date.format(this.colHeadFormat)) +
				'</th>';

		}

	},

	setCustomProperty:function(propName){
		this.customPropertyName = propName;
	},

	// new method to pass in custom columns defined in the View
	setCustomColumns:function(customColumns, columnMap){
		this.customColumns = customColumns;
		this.customColumnMap = columnMap;
	},

	rangeUpdated: function() {
		var view = this.view;
		var colDates = [];
		var date;

		date = this.start.clone();
		while (date.isBefore(this.end)) {
			colDates.push(date.clone());
			date.add(1, 'day');
			date = view.skipHiddenDays(date);
		}

		if (this.isRTL) {
			colDates.reverse();
		}

		this.colDates = colDates;
		//----------------------------
		// Added support for custom columns
		//----------------------------
		if($.isArray(this.customColumns) && this.customColumns.length > 0){
			this.colCnt = this.customColumns.length;
		}else{
			this.colCnt = colDates.length;
		}

		this.rowCnt = Math.ceil((this.maxTime - this.minTime) / this.snapDuration); // # of vertical snaps
	},

	selectionRangeToSegs:function(range){
		return this.rangeToSegs(range);
	},

	computeSelection:function(firstCell, lastCell){
		var range = TimeGrid.prototype.computeSelection.apply(this, arguments);
		if($.isArray(this.customColumns) && this.customColumns.length > 0){
			if($.isPlainObject(firstCell) && $.isPlainObject(this.customColumns[firstCell.col])){
				range.constrainCol = firstCell.col;
				range.customProperty = this.customColumns[firstCell.col];
			}
		}
		return range;
	},

	// Slices up a date range by column into an array of segments
	rangeToSegs: function(range) {
		var colCnt = this.colCnt;
		var segs = [];
		var seg;
		var col;
		var colDate;
		var colRange;
		var constrainColumn;
		if($.isPlainObject(range) && range.constrainCol !== undefined){
			constrainColumn = range.constrainCol;
		}

		// normalize :(
		range = {
			start: range.start.clone().stripZone(),
			end: range.end.clone().stripZone()
		};

		for (col = 0; col < colCnt; col++) {
			//----------------------------
			// if there is only one date, repeat it on every column
			//----------------------------
			if(this.colDates.length == 1){
				colDate = this.colDates[0]; // will be ambig time/timezone
			}else{
				colDate = this.colDates[col]; // will be ambig time/timezone
			}
			colRange = {
				start: colDate.clone().time(this.minTime),
				end: colDate.clone().time(this.maxTime)
			};
			seg = intersectionToSeg(range, colRange); // both will be ambig timezone
			if (seg) {
				seg.col = col;
				if(constrainColumn === undefined || col == constrainColumn){
					segs.push(seg);
				}
			}
		}

		return segs;
	},	

	// Given a cell object, generates its start date. Returns a reference-free copy.
	computeCellDate: function(cell) {
		var date;
		//----------------------------
		// if there is only one date, repeat it on every column
		//----------------------------
		if(this.colDates.length == 1){
			date = this.colDates[0]; // will be ambig time/timezone
		}else{
			date = this.colDates[cell.col]; // will be ambig time/timezone
		}

		var time = this.computeSnapTime(cell.row);

		date = this.view.calendar.rezoneDate(date); // give it a 00:00 time
		date.time(time);

		return date;
	},

	//----------------------------
	// Overriden from TimeGrid.events.js to add support for customColumns
	//----------------------------

	// Renders and returns the <table> portion of the event-skeleton.
	// Returns an object with properties 'tbodyEl' and 'segs'.
	renderSegTable: function(segs) {
		var tableEl = $('<table><tr/></table>');
		var trEl = tableEl.find('tr');
		var segCols;
		var i, seg;
		var col, colSegs;
		var containerEl;

		segCols = this.groupSegCols(segs); // group into sub-arrays, and assigns 'col' to each seg

		this.computeSegVerticals(segs); // compute and assign top/bottom

		for (col = 0; col < segCols.length; col++) { // iterate each column grouping
			colSegs = segCols[col];
			this.placeSlotSegs(colSegs); // compute horizontal coordinates, z-index's, and reorder the array

			containerEl = $('<div class="fc-event-container"/>');

			// assign positioning CSS and insert into container
			for (i = 0; i < colSegs.length; i++) {
				seg = colSegs[i];
				
				// skip this cycle if the customProperty id doesn't match the custom column id
				if($.isArray(this.customColumns) && this.customColumns.length > 0){
					if($.isPlainObject(seg) && $.isPlainObject(seg.event) && $.isPlainObject(seg.event.rawEvent) && $.isPlainObject(seg.event.rawEvent[this.customPropertyName])){
						var customPropertyObj = seg.event.rawEvent[this.customPropertyName];
						var customCol = this.customColumns[col];
						if($.isPlainObject(customCol) && customCol.id != customPropertyObj.id){
							continue
						}
					}
				}

				seg.el.css(this.generateSegPositionCss(seg));

				// if the height is short, add a className for alternate styling
				if (seg.bottom - seg.top < 30) {
					seg.el.addClass('fc-short');
				}

				containerEl.append(seg.el);
			}

			trEl.append($('<td/>').append(containerEl));
		}

		this.bookendCells(trEl, 'eventSkeleton');

		return tableEl;
	},

	// override the global defined in the TimeGrid.events.js
	// Do these segments occupy the same vertical space?
	isSlotSegCollision: function(seg1, seg2) {
		if($.isPlainObject(seg1.event.rawEvent) && $.isPlainObject(seg2.event.rawEvent)){
			var customProp1 = seg1.event.rawEvent[this.customPropertyName];
			var customProp2 = seg2.event.rawEvent[this.customPropertyName];
			if($.isPlainObject(customProp1) && $.isPlainObject(customProp2)){
				return customProp1.id == customProp2.id && seg1.bottom > seg2.top && seg1.top < seg2.bottom;
			}
		}


		return seg1.bottom > seg2.top && seg1.top < seg2.bottom;
	},	


	// Renders a mock "helper" event. `sourceSeg` is the original segment object and might be null (an external drag)
	renderHelper: function(event, sourceSeg) {
		var segs = this.eventsToSegs([ event ], null, true);

		var newSegs = [];
		for (var i = 0; i < segs.length; i++) {
			var seg = segs[i];
			if(sourceSeg.col == seg.col){
				newSegs.push(seg);
			}
		};

		var tableEl;
		var i, seg;
		var sourceEl;

		newSegs = this.renderFgSegEls(newSegs); // assigns each seg's el and returns a subset of segs that were rendered
		tableEl = this.renderSegTable(newSegs);

		// Try to make the segment that is in the same row as sourceSeg look the same
		for (i = 0; i < newSegs.length; i++) {
			seg = newSegs[i];
			if (sourceSeg && sourceSeg.col === seg.col) {
				sourceEl = sourceSeg.el;
				seg.el.css({
					left: sourceEl.css('left'),
					right: sourceEl.css('right'),
					'margin-left': sourceEl.css('margin-left'),
					'margin-right': sourceEl.css('margin-right')
				});
			}
		}

		this.helperEl = $('<div class="fc-helper-skeleton"/>')
			.append(tableEl)
				.appendTo(this.el);
	},	

	// Renders a set of rectangles over the given time segments.
	// Only returns segments that successfully rendered.
	renderFill: function(type, segs, className) {
		var segCols;
		var skeletonEl;
		var trEl;
		var col, colSegs;
		var tdEl;
		var containerEl;
		var dayDate;
		var i, seg;

		if (segs.length) {

			segs = this.renderFillSegEls(type, segs); // assignes `.el` to each seg. returns successfully rendered segs
			segCols = this.groupSegCols(segs); // group into sub-arrays, and assigns 'col' to each seg

			className = className || type.toLowerCase();
			skeletonEl = $(
				'<div class="fc-' + className + '-skeleton">' +
					'<table><tr/></table>' +
				'</div>'
			);
			trEl = skeletonEl.find('tr');

			for (col = 0; col < segCols.length; col++) {
				colSegs = segCols[col];
				tdEl = $('<td/>').appendTo(trEl);

				if (colSegs.length) {
					containerEl = $('<div class="fc-' + className + '-container"/>').appendTo(tdEl);
					//----------------------------
					// if there is only one date, repeat it on every column
					//----------------------------
					if(this.colDates.length == 1){
						dayDate = this.colDates[0]; // will be ambig time/timezone
					}else{
						dayDate = this.colDates[col]; // will be ambig time/timezone
					}					

					for (i = 0; i < colSegs.length; i++) {
						seg = colSegs[i];
						containerEl.append(
							seg.el.css({
								top: this.computeDateTop(seg.start, dayDate),
								bottom: -this.computeDateTop(seg.end, dayDate) // the y position of the bottom edge
							})
						);
					}
				}
			}

			this.bookendCells(trEl, type);

			this.el.append(skeletonEl);
			this.elsByFill[type] = skeletonEl;
		}

		return segs;
	}

});	

function groupEventsById(events) {
	var eventsById = {};
	var i, event;

	for (i = 0; i < events.length; i++) {
		event = events[i];
		(eventsById[event._id] || (eventsById[event._id] = [])).push(event);
	}

	return eventsById;
}

function isInverseBgEvent(event) {
	return getEventRendering(event) === 'inverse-background';
}


function getEventRendering(event) {
	return firstDefined((event.source || {}).rendering, event.rendering);
}


