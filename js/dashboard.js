/* Scripts for DonorBuddy dashboard page
**
** Form is handled via a POST through a custom Google App Script proxy into the backend spreadsheet
**
*/

const url = "https://script.google.com/macros/s/AKfycbzF0quGy9vjwywjCZx1-vOE0FuYEzJBhavkg1mfN91CHkD35Z0_Lytlxz6acq3y2GiMkw/exec"; // API endpoint
const loginForm = document.getElementById("loginForm");
const optimiseForm = document.getElementById("optimiseForm");
const discoverForm = document.getElementById("discoverForm");

const userID = document.getElementById("userID");
const loginBtn = document.getElementById("btn-login");

var userInfo = "null";
var gridOptions = {};
var debugO={};
var debugA=[];

$(document).ready(prefillForm);

function prefillForm() {
	// attempt to prefill the form using URL query string
	
	// TODO: grab query string, split it, decode it, grab FormData via API, set as many fields as possible
	
}

loginForm.addEventListener("submit", (e) => {

	e.preventDefault(); // prevent default behaviour ie disable form submission
	
	// set form elements readonly and disable submit button

	//$('#btn-login').prop('disabled','disabled').attr('style','background-color: gray').text('logout');
	
	$('#btn-login').attr('style','background-color: gray').text('logout').click(function(){location.href="dashboard.html";});
	
	$("#loginForm :input").prop('readonly', true);

	fetchUserInfo();
});

discoverForm.addEventListener("submit", (e) => {	
	e.preventDefault(); // prevent default behaviour ie disable form submission
	initDiscover(discoverForm.maxDiscover.value);
});

optimiseForm.addEventListener("submit", (e) => {	
	e.preventDefault(); // prevent default behaviour ie disable form submission
	initOptimise(optimiseForm.budget.value, optimiseForm.maxTrans.value);
});

var params = new URLSearchParams(document.location.search);		// extract 'user' parameter for query string
var userQuery = params.get("user");

if (userQuery) {
	userID.value = userQuery;									// set form value, if found
	loginBtn.click();											// click the login button
}

async function fetchUserInfo() {

    let response = await fetch(url+'?user='+userID.value, {
		method: "GET"});
    let t = await response.json();
	
	//alert(t);
	userInfo = t;
	if(!t || typeof(t) == 'undefined') {
		alert("User "+userID.value+" was not found. Please try again.");
		
		$('#btn-login').prop('disabled','').attr('style','background-color: secondary');
		$("#loginForm :input").prop('readonly', false);
		return;
	}
	
	displayTransactions("Actual");
	
	displayAnalysis();
	
	return;
}

function displayTransactions(mode){
	
	// function to tranform transaction data and create dataGrid for browsing;
	// also creates inspector panel to display charity details
	// supports two modes: "Actual" (real historical transactions) and "Discover" or "Optimise"
	
	if (!mode || typeof(mode)==="null")
		mode="Actual";

	const h = userInfo.transactions[0];										// grab headers from first row	
	switch(mode) {
		case "Actual":
			var gridDiv = "ActualGrid";
			var data = userInfo.transactions.slice(1);						// If "actual", grab data from rest of user's transaction table
		break;

		case "Discover":
			var gridDiv = "PlanGrid";
			var data = userInfo.bestSuggestions.transactions.slice(1);						// replace with bestSuggestions
		break;

		case "Optimise":
			var gridDiv = "PlanGrid";
			var data = userInfo.bestSolution.transactions.slice(1);						// replace with bestSolution
		break;		
	}
	// build headers

/*
PrivateID	ABN	Date	Amount	Charity Name	Website	Size	Location	Places	Goals	Beneficiaries	Tax Status	ACNC ID	TotalGrossIncomeGovernmentGrants	TotalGrossIncomeOtherRevenues	TotalGrossIncomeDonationsAndRequests	TotalGrossIncomeGoodsOrServices	TotalGrossIncomeInvestments	TotalExpensesGrantsAndDonationsInAustralia	TotalExpensesGrantsAndDonationsOutsideAustralia	TotalExpensesInterest	TotalExpensesOther	TotalExpensesEmployee	DonorReliance	EmployeeShare	DonationRank		
*/

	const hdrs = [
		{ field: 'Date', hide: false, width: 120, filter: 'agDateColumnFilter', valueFormatter: params => dateFormatter(params.value),sort:'asc', headerTooltip: 'Date of your donation',
		        filterParams: {
                // provide comparator function
                comparator: (filterLocalDateAtMidnight, cellValue) => {
                    const dateAsString = cellValue;

                    if (dateAsString == null) {
                        return 0;
                    }

                    // In the example application, dates are stored as yyyy-mm-dd
                    // We create a Date object for comparison against the filter date
                    const dateParts = dateAsString.split('-');
                    const year = Number(dateParts[0]);
                    const month = Number(dateParts[1]) - 1;
                    const day = Number(dateParts[2]);
                    const cellDate = new Date(year, month, day);
					 
                    // Now that both parameters are Date objects, we can compare
                    if (cellDate < filterLocalDateAtMidnight) {
                        return -1;
                    } else if (cellDate > filterLocalDateAtMidnight) {
                        return 1;
                    }
                    return 0;
                }
            }
		},
		{ field: 'Charity Name', hide: false, width: 300, headerTooltip: 'Registered name of the charity'},
		{ field: 'Amount', hide: false, width: 120, type: 'rightAligned', filter: 'agNumberColumnFilter', valueFormatter: params => currencyFormatter(params.value), headerTooltip: 'Amount you donated'},
		{ field: 'DonorReliance', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, valueFormatter: params => percentFormatter(params.value), headerTooltip: 'Share of income from donations'},
		{ field: 'EmployeeShare', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, filter: 'agNumberColumnFilter', valueFormatter: params => percentFormatter(params.value),headerTooltip: 'Share of expenses going to employees'},
		{ field: 'DonationRank', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, filter: 'agNumberColumnFilter', valueFormatter: params => percentFormatter(params.value), headerTooltip: 'Rank within all Australian charities by total donations'},
		{ field: 'Goals', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Goals of the charity'},
		{ field: 'Places', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Places where the charity operates'},
		{ field: 'Beneficiaries', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Beneficiaries of the charity'},
	];		

	// Grid Options are properties passed to the grid
    gridOptions = {

	 // each entry here represents one column
		columnDefs: hdrs,	 

		defaultColDef: {sortable: true, filter: true, hide: true, resizable: true},
		paginationAutoPageSize: true,
		pagination: true,
		tooltipShowDelay: 300,

		rowSelection: 'single', // allow rows to be selected
		
		rowData: data,
		
		 // example event handler
		onCellClicked: params => {
			inspectCharity(params.node.id,mode);
		}
	};

	// get div to host the grid
	const eGridDiv = document.getElementById(gridDiv);
	// new grid instance, passing in the hosting DIV and Grid Options
	new agGrid.Grid(eGridDiv, gridOptions);

	inspectCharity(0,mode);
	
	return;
}

function dateFormatter(params) {
	
	var d = new Date(params);
	return d.toLocaleDateString();
}

function currencyFormatter(params,p) {
	if (params=='0' | !params)
		return '';

	if (p==0) 
		return '$'+Math.round(params).toLocaleString('en-US');
	
	if (!p)
		p=2;						// default precision

	return '$'+Number(parseFloat(params).toFixed(p)).toLocaleString('en-US', {minimumFractionDigits: p});
}

function percentFormatter(params) {
	if (!params || params == '')
		return "";
	return String(Math.floor(parseFloat(params)*100+0.5))+"%";
}

function monthFormatter(params) {
	if (!params || params == '')
		return '';
	const y = params.substr(0,4);
	const m = params.substr(5,2);
	
	return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1] + ', ' + y;
}

function tagRenderer(params) {
	
	var html='';
	
	if (params.value.length==1 && params.value[0]=='')
			return html;
		
	for(var i=0; i<params.value.length; i++) {				
		
		html+='<span class="btn btn-sm btn-outline-info small" title="click to filter" onclick="toggleTag(\''+params.value[i]+'\',\''+params.column.colId+'\');">' + params.value[i] + '</span>&nbsp;';
	}
	return html;
}
	
function toggleTag(tag, col) {
	
	//alert('toggleTag: tag: ' +tag+ ' col: '+col);
	
	// Get a reference to the filter instance
	const filterInstance = gridOptions.api.getFilterInstance(col); 

	//debugO=filterInstance;
	if(!filterInstance.appliedModel || filterInstance.appliedModel=='') {
		// if there's no filter, set the filter model to be the tag
		filterInstance.setModel({
			filterType: 'text',
			type: 'contains',
			filter: tag,
		});
	}
	else {
		// Reset the filter model
		filterInstance.setModel(null);
	}
	
	// Tell grid to run filter operation again
	gridOptions.api.onFilterChanged();
	
	return;
}

function inspectCharity(id,mode) {
	
	if (!mode || typeof(mode)==="null")
		mode="Actual";
	
	const row = parseInt(id)+1;
	
		switch(mode) {
			case "Actual":
				var inspectDiv = "ActualInspect";
				var trans = userInfo.transactions;						// If "actual", grab data from rest of user's transaction table
				var label="Actual";
			break;

			case "Discover":
				var inspectDiv = "PlanInspect";
				var trans = userInfo.bestSuggestions.transactions;						
				var label="Plan";
			break;

			case "Optimise":
				var inspectDiv = "PlanInspect";
				var trans = userInfo.bestSolution.transactions;					
				var label="Plan";
			break;		
	}
	var u = trans[row];
	
	elem = document.getElementById(inspectDiv);
	
	// tally all gifts to charity			
	
	var giftTotal=0; var giftCount=0;
	
	for(i in trans) {
		if (trans[i].ABN == u.ABN) {
			giftTotal += trans[i].Amount;
			giftCount++;
		}
	}		
	
	const mapping = {
		"Insp-name": u['Charity Name'],
		"Insp-web": u['Website'],
		"Insp-acnc": u['ACNC ID'],
		"Insp-abr": u['ABN'],
		"Insp-location": u['Location'],
		"Insp-goals": u['Goals'].join(' '),
		"Insp-places": u['Places'].join(' '),
		"Insp-beneficiaries": u['Beneficiaries'].join(' '),
		"Insp-tax": u['Tax Status'],
		"Insp-reliance": percentFormatter(u['DonorReliance']),
		"Insp-share": percentFormatter(u['EmployeeShare']),
		"Insp-rank": percentFormatter(u['DonationRank']),
		"Insp-total": currencyFormatter(giftTotal),
		"Insp-count": giftCount
		};
	
	for (var i in mapping) {
		switch(i) {
			case 'Insp-web':
				document.getElementById(label+i).href='https://'+mapping[i];
			break;
			case 'Insp-acnc':
				document.getElementById(label+i).href='https://www.acnc.gov.au/charity/charities/'+mapping[i]+'/profile';
			break;
			case 'Insp-abr':
				document.getElementById(label+i).href='https://www.abr.business.gov.au/ABN/View?id='+mapping[i];
			break;
			default:
				document.getElementById(label+i).innerHTML = mapping[i];
		}
	}
	
	elem.style.display="block";
	
	return;
}
	
function displayAnalysis(){

	// Function to create dataset for charting, builds and attaches interactive charting
	// First visualisation is cumulative chart: a stacked line chart of transaction amounts by tax status
	// Second visualisation is monthlyChart: a stacked column chart of transaction amounts by month by charity
	// Third, fourth and fifth is breakdown{goals, places, beneficiaries}: a bar chart of transaction amount by category
	
	const h = userInfo.transactions[0];								// grab headers from first row
	
	const data = userInfo.transactions.slice(1);					// grab data from rest of table
	
	// build arrays of unique months, charities, tax statuses
	var uniqMonths = [];
	var uniqCharities = [];
	var uniqTax = [];
	var totalAmount = 0;
	
	const allMonths=['2022-07','2022-08','2022-09','2022-10','2022-11','2022-12','2023-01','2023-02','2023-03','2023-04','2023-05','2023-06','2023-07','2023-08','2023-09','2023-10','2023-11','2023-12']; 

	for (var i in data) {
		
		var month = data[i]['Date'].substr(0,7);
		var charity = data[i]['Charity Name'];
		var tax = data[i]['Tax Status'];
		totalAmount += data[i]['Amount'];
		
		if (!uniqMonths.includes(month))
			uniqMonths.push(month);
	
		if (!uniqCharities.includes(charity))
			uniqCharities.push(charity);
		
		if (!uniqTax.includes(tax))
			uniqTax.push(tax);
	}
	
	// unique months becomes the first n months of all months, where n is the latest month in uniq months
	// ensures all months are present, up to the last month
	
	uniqMonths = allMonths.slice(0, 1+
		allMonths.findIndex(
			(x) => { return x==uniqMonths.sort()[uniqMonths.length-1];}));
	
	// build transformed data
	var transData = [];
	for (var i in uniqMonths) {
		transData[i] = {month: uniqMonths[i]};
		
		for (var j in uniqCharities) {
			var a=0;
			for (var k in data) {
				if (data[k]['Date'].substr(0,7)==uniqMonths[i] && data[k]['Charity Name'] == uniqCharities[j])
					a+= data[k]['Amount'];
			}
			transData[i][uniqCharities[j]] = a;
		}
		
		for (var m in uniqTax) {
			var a=0;
			for (var n in data) {
				if (data[n]['Date'].substr(0,7)==uniqMonths[i] && data[n]['Tax Status']== uniqTax[m])
					a+=data[n]['Amount'];
			}
			
			// cumulative amounts
			
			if(i==0)
				transData[i][uniqTax[m]] = a;
			else
				transData[i][uniqTax[m]] = transData[i-1][uniqTax[m]] + a;
		}
	}
	 
	// build series data for cumulative tax chart
	var seriesCumulative=[];
	for (var i in uniqTax) {
		seriesCumulative.push( {
			type: 'area',
			xKey: 'month',
			yKey: uniqTax[i],
			yName: uniqTax[i],
			stacked: true,
			tooltip: {
				renderer: function (params) {
					return {
						content: monthFormatter(params.xValue)+': '+currencyFormatter(params.yValue),
						title: params.yName
					};
				}
			}
		});
	}
	 
	// build series data for monthly chart
	var seriesMonthly=[];
	for (var i in uniqCharities) {
		seriesMonthly.push( {
			type: 'column',
			xKey: 'month',
			yKey: uniqCharities[i],
			yName: uniqCharities[i],
			stacked: true,
			label: { 
				formatter: params => currencyFormatter(params.value,0),
				fontSize: 10
				},
			tooltip: {
				renderer: function (params) {
					return {
						content: monthFormatter(params.xValue)+': '+currencyFormatter(params.yValue),
						title: params.yName
					};
				}
			}
		});
	}
	
	// set up cumulative charting options
	
	var cumulativeChartOptions = {
		container: document.getElementById('cumulativeChart'),
		theme: 'ag-pastel',
		/*navigator: {
			enabled: true				// sliding window
		},
		*/
		title: {
			text: 'Cumulative Gift Amounts',
		},
		subtitle: {
			text: 'By tax status',
		},
		axes: [
			{
				type: 'number',
				position: 'left',
				label: {
					format: '$,d',
				},
			},
			{
				type: 'category',
				position: 'bottom',
				label: {
					formatter: (params) => {return monthFormatter(params.value).substr(0,3);}			// just show month; year should be clear from context
			  },
			},
		  ],
		legend: {
			position: 'bottom'
		},
		data: transData,
		series: seriesCumulative
	}
	
	//debugA = seriesCumulative;
	debugA = transData;
	
	agCharts.AgChart.create(cumulativeChartOptions);
	

	// set up monthly charting options 
	var monthlyChartOptions = {
		container: document.getElementById('monthlyChart'),
		theme: 'ag-pastel',
		/*navigator: {
			enabled: true				// sliding window
		},
		*/
		title: {
			text: 'Monthly Gift Amounts',
		},
		subtitle: {
			text: 'By charity',
		},
		axes: [
			{
				type: 'number',
				position: 'left',
				label: {
					format: '$~s',
					formatter: params => currencyFormatter(params.value,0),
			  },
			},
			{
				type: 'category',
				position: 'bottom',
				label: {
					formatter: params => monthFormatter(params.value).substr(0,3),			// just show month; year should be clear from context
			  },
			},
		  ],
		legend: {enabled: false},
		data: transData,
		series: seriesMonthly
	}
	
	//debugA = seriesMonthly;
	
	agCharts.AgChart.create(monthlyChartOptions);
	
	// build Goals, Places and Beneficiaries data
	
	var uniq = {'Goals': {}, 'Places': {}, 'Beneficiaries': {} };
	var chartData = {};
	var chartOptions = {};
	userInfo.breakdownChart = {};
	
	for (var c in uniq) {												// iterate through each category dimension (goals, place, beneficiaries)

		// accumulate giving amount values by category
		for (var i in data) {
			data[i][c].forEach(
				(x) => {
					if (uniq[c][x])
						uniq[c][x] += data[i]['Amount'];
					else 
						if (x != '')									// exclude empty string as tag
							uniq[c][x] = data[i]['Amount']
				});
		}
		
		debugO = uniq;
		
		chartData[c]=[];
		
		for (var u in uniq[c])
			if (userInfo['details'][c].includes(u.toLowerCase())) {					// user's preferred category value
				chartData[c].push({'Category': u, 'Other': 0, 'Preferred': uniq[c][u]});
				//chartData[c].push({'Category': u, 'AmountPref': uniq[c][u]});
			}
			else {
				chartData[c].push({'Category': u, 'Other': uniq[c][u], 'Preferred': 0});
				//chartData[c].push({'Category': u, 'AmountPref': 0});
			}
			
		// sort categories from biggest to smallest by Amount
		
		chartData[c].sort( (a,b)=>{return (b.Preferred+b.Other) - (a.Preferred+a.Other);})
		
		// set up charting options
			chartOptions[c] = {
			container: document.getElementById('breakdown'+c),
			theme: 'ag-pastel',
			/*navigator: {
				enabled: true
			},
			*/
			title: {
				text: 'Breakdown by '+c,
			},
			subtitle: {
				text: 'Across your preferred categories and others',
			},
			axes: [
				{
					type: 'number',
					position: 'left',
					label: {
						format: '$,d',
						formatter: params => currencyFormatter(params.value,0),
					},
				},
				{
					type: 'category',
					position: 'bottom',
				},
			  ],
			legend: {enabled: true, position: 'bottom', },
			data: chartData[c],
			series: [{ 
				type: 'column', xKey: 'Category', yKey: 'Other', stacked: true,
				label: {
					formatter: params => currencyFormatter(params.value,0),
					fontSize: 10
				},
				tooltip: {
					renderer: function (params) {
						return {
							content: 'Amount: '+currencyFormatter(params.yValue)+'  ('+percentFormatter(params.yValue/totalAmount)+')',
							title: refDataFlat[params.xValue]
						};
					}
				},
				fill: '#9cc3d5', 		//'#ebcc87', 
				stroke: '#9cc3d5', 		//'#ebcc87', 
			},
			{ 
				type: 'column', xKey: 'Category', yKey: 'Preferred', stacked: true,
				label: {
					formatter: params => currencyFormatter(params.value,0),
					fontSize: 10
				},
				tooltip: {
					renderer: function (params) {
						return {
							content: 'Amount: '+currencyFormatter(params.yValue)+'  ('+percentFormatter(params.yValue/totalAmount)+')',
							title: refDataFlat[params.xValue]
						};
					}
				},
				fill: '#ebcc87', 		//'#ebcc87', 
				stroke: '#ebcc87', 		//'#ebcc87', 
			}]
		}
		
		agCharts.AgChart.create(chartOptions[c]);
		
	}
	
	userInfo.breakdownChart = chartOptions;
	console.log(userInfo.breakdownChart);
	console.log(transData);
	//debugA = chartData;
	
	// Build and display Summary panel
	
	const elem = document.getElementById('summary');
	var taxTotal = 0;
	if (Object.hasOwn(transData[transData.length-1],'Not registered')) {
		taxTotal = totalAmount - transData[transData.length-1]['Not registered']; 
		//alert(taxTotal);
	}

	
	const mapping = {
		"summary-total": currencyFormatter(totalAmount,2),
		"summary-gift": data.length,
		"summary-charities": uniqCharities.length,
		"summary-monthly": currencyFormatter(totalAmount/uniqMonths.length,2),
		"summary-amount": currencyFormatter(totalAmount/data.length,2),
		"summary-tax": currencyFormatter(taxTotal,2),
		"summary-days": Math.round((uniqMonths.length*30.5)/data.length),
		"summary-goal": chartData['Goals'].length>0?chartData['Goals'][0]['Category']:0,
		"summary-place": chartData['Places'].length>0?chartData['Places'][0]['Category']:0,
		"summary-beneficiary": chartData['Beneficiaries'].length>0?chartData['Beneficiaries'][0]['Category']:0,
		};
	
	//var a=0; var t=transData[transData.length-1]; alert(uniqTax+' ---'+ uniqTax.length);
	//alert(uniqTax.forEach(function(e){if (!e) return; if(t[e])alert(' ---' +e)}));
	
	for (var i in mapping) {
		switch(i) {
			default:
				document.getElementById(i).innerHTML = mapping[i];
		}
	}
	
	elem.style.display='block';
	
	userInfo.allocations = chartData;			// read-only
	
	return;
}

function displayPlanner(mode) {
	/* Function to display the results of a plan change.
	** Displays future transactions in a table, with an inspector next to it.
	** Also displays charts of the plan vs actual.
	** Supports three modes:
	** Discover
	** Optimise
	** Manual
	*/
	
	// Build transaction dataset into transData
	
	var trans=[];
	
			switch(mode) {
			case "Discover":
				var plan  = userInfo.bestSuggestions.plan;
				userInfo.bestSuggestions.transactions = trans;
				var categories = userInfo.bestSuggestions.params.active;
				var data = userInfo.bestSuggestions.allocations;
			break;

			case "Optimise":
				var plan = userInfo.bestSolution.plan;
				userInfo.bestSolution.transactions = trans;
				var categories = userInfo.bestSolution.params.active;
				var data = userInfo.bestSolution.allocations;
			break;		
	}
	// convert plan to transaction (ie adding reference data) via candidate dataset
	trans.push(userInfo.transactions[0]);		// add header row
	for(var t=1; t<candidates.length; t++) {
		for(var p=0; p<plan.length; p++) {
			if(candidates[t]['Charity Name']==plan[p]['Charity Name']) {
					trans.push(candidates[t]);
					trans[trans.length-1]['Amount']=plan[p]['Amount'];
			}
		}
	}
	
	displayTransactions(mode);
	
	// Add charts of plan breakdown
	
	if(mode=="Discover") {
		allocationChart=[];
		var val=-1;
		
		for (var c in categories) {
			// convert plan allocation to allocation chart view
			allocationChart[categories[c]] = userInfo.breakdownChart[categories[c]].data;			// copy historical data structure
			for (var a in allocationChart[categories[c]]) {
				val = data[categories[c]][allocationChart[categories[c]][a]['Category']];	
				if(allocationChart[categories[c]][a]['Preferred']>0) {
					allocationChart[categories[c]][a]['Preferred'] = val;		// overwrite preferred value
				} else {
					allocationChart[categories[c]][a]['Other'] = val;		// overwrite preferred value
				}
			}
		
			userInfo.breakdownChart[categories[c]].container=document.getElementById('breakdownPlan'+categories[c]);
			userInfo.breakdownChart[categories[c]].data=allocationChart[categories[c]];
			agCharts.AgChart.create(userInfo.breakdownChart[categories[c]]);
		}
	}
	else {
		for (var c in categories) {
			userInfo.breakdownChart[categories[c]].container=document.getElementById('breakdownPlan'+categories[c]);
			userInfo.breakdownChart[categories[c]].data=data[categories[c]];
			agCharts.AgChart.create(userInfo.breakdownChart[categories[c]]);	
		}	
	}
	
	return;	
}


function initDiscover(maxSuggestions) {
	/* function to initialise and invoke recursive solver
	Once it has a suggestion set, it then invokes the display function.
	*/
	
	userInfo.bestSuggestions={};				// set global variable
	
	var newSuggestions = 
		{
			"params": {
				"maxSuggestions": Number(maxDiscover)||5,
				"active": ["Goals", "Places", "Beneficiaries"],
				"maxSolve": 1e4,
				"searchWidth": 5
			},
			"eval": {
				"baseE": 0,						// placeholder
				"finalE": 0,
				"countSuggestions": 0,
				"countSolve": 0,				// use this globally
				"totalValue": 0
			},
			"plan": [
//				{"Charity Name": "Oxfam", "Amount": 300},
//				{"Charity Name": "Red Cross", "Amount": 100},
//				{"Charity Name": "UniMelb", "Amount": 400},
//				{"Charity Name": "CERES", "Amount": 200},
//				{"Charity Name": "RSPCA", "Amount": 300}
			],
			"allocations": {}
		};

	// create novel list ie candidate charities except those already donated to
	var novels=[]; //candidates.slice(1);
	for (var a=1; a<candidates.length; a++) {
		match=false;
		for (var t=1; t<userInfo.transactions.length && !match; t++) {			// t=1 to skip header row
			if (userInfo.transactions[t]['ABN']==candidates[a]['ABN'])
				match=true;
				//console.log('initDiscover: found match '+candidates[a]['Charity Name']+' with a='+a+' t='+t);
		}
		if (!match)
			novels.push(candidates[a]);
	}
	//userInfo.novels=novels=candidates.slice(1);
	userInfo.novels=novels;
	
	// Set base allocations  (and calculate baseline Error along the way as square of the sum of the allocations)
	
	newSuggestions.allocations = JSON.parse(JSON.stringify(refData).replace(/:\"[^\"]*\"/g,":0"));	// deep copy reference data, setting text values to zero
		
	var labels;
	var category;
	var E=0;
	var val;
	for (var c in newSuggestions.params.active) {												// sweep through all active categories
		category = newSuggestions.params.active[c];
		labels = userInfo.allocations[category];												// pick up all labels in historical allocations
		for (var l in labels) {
			val = userInfo.allocations[category][l]['Preferred']+userInfo.allocations[category][l]['Other'];
			newSuggestions.allocations[category][labels[l]['Category']]=val;
			E += val*val;
		}
	}
	
	console.log("initDiscover: Base E="+E);

	newSuggestions.eval.baseE = E;
	
	newSuggestions.eval.finalE = E;		//1e10;

	userInfo.bestSuggestions = JSON.parse(JSON.stringify(newSuggestions));
		
	discover(newSuggestions);
	
	var score = String(Math.floor(((userInfo.bestSuggestions.eval.baseE-userInfo.bestSuggestions.eval.finalE)/userInfo.bestSuggestions.eval.baseE)*100+0.5)+"%");
	
	
	console.log("initDiscover: completed search. Similarity score is: "+score+"  Best suggestions are: ")
	console.log(userInfo.bestSuggestions);
	
	displayPlanner("Discover");
	
	return;
}

function discover(suggestions) {
	
	/* function outputs a set of suggested future transactions using a dynamic programming heuristic
		This set of transactions is chosen to mimic closely the historical transactions, in terms of dollar allocations to the tags.
		It does this by minimising the square of the tag-wise error between actual and suggested.
	
		Take in a suggestions object, returns a suggestions object
	
	Given:
	
		A set of historical transactions (userInfo.transactions)
		A set of optimisation constraints (maxDiscover and maxSolve)
		A set of candidate novel charities to transact on (novels)
		An objective function (minimise the square of the error term)
			Error (E) - sum over all tags of the square of the difference between the suggested transactions' allocation and the historical ones
	
	Heuristic - branch-and-bound on depth-first-search via tail recursion:
	
		Test if any constraints broken; if so halt
		
		Test if current suggestions are globally best; if so, replace

		Iterate over each possible novel transaction
		
			Iterate over each label in the active categories
			
				Count and sum allocations in the matching label
				
			Calculate the transaction value as the mean value of the match-set
			
			Create new allocations
				If in the match-set, old allocation minus the transaction value; otherwise just the old allocation
				
			Calculate the Error of the new allocations
			
		Rank the novels by Error (low to high) and then by popularity (high to low)
		
		Call "discover" recursively on the best maxBreadth suggestions
			
*/

	// Test if current suggestions are globally best; if so, replace
	
	if (suggestions.eval.finalE < userInfo.bestSuggestions.eval.finalE) {
	
		var countSolve = userInfo.bestSuggestions.eval.countSolve;
		console.log("Discover: New winner found. finalE="+suggestions.eval.finalE+" old finalE="+ userInfo.bestSuggestions.eval.finalE+" + totalValue="+suggestions.eval.totalValue+" countSolve="+countSolve);

		userInfo.bestSuggestions = suggestions;
		userInfo.bestSuggestions.eval.countSolve = countSolve;
	}

	// Test if any constraints have been broken
	
	if (suggestions.eval.countSuggestions > suggestions.params.maxSuggestions || 
		userInfo.bestSuggestions.eval.countSolve > userInfo.bestSuggestions.params.maxSolve) {
		//console.log('discover: broke constraints: countSuggestions=' + suggestions.eval.countSuggestions +'  countSolve='+userInfo.bestSuggestions.eval.countSolve);
		return;
	}
	
	// Iterate over each novel transactions
	
	var matchCount=0;
	var matchSum=0;
	var mean=0;
	var E=0;
	var newSuggestions={};
	var candidateSuggestions=[];
	var category;
	var transLabels;
	
	for (var n in userInfo.novels) {
		newSuggestions=JSON.parse(JSON.stringify(suggestions));								// deep-copy the original suggestions
		var matchCount=0;
		var matchSum=0;
		var E=0;
		for (var c in newSuggestions.params.active) {													// sweep through all labels of the target novel transaction
			category=newSuggestions.params.active[c];
			transLabels = userInfo.novels[n][category];
			if (transLabels=='')
				continue;
			for (var t in transLabels) {
				if (newSuggestions.allocations[category][transLabels[t]]!=0) {							// test for a label match in novel transaction and full allocations
					matchCount++;
					//console.log('discover: category=' +category+' t=' + t+ 'transLabels[t]='+transLabels[t]+' suggestions.allocations[category][transLabels[t]]=' + suggestions.allocations[category][transLabels[t]]);
					matchSum += newSuggestions.allocations[category][transLabels[t]];
				}
			}
		}
		
		// if no matches, then break out of the loop and retry;
		
		if (matchCount==0 || matchSum==0) {
			//console.log("Discover: no match in novel transaction n="+n+" in category= "+category); 
			continue;
		}
		
		mean = matchSum/matchCount;															// calculate optimal transaction value

		if (mean<0) {
			//console.log("discover: negative transaction value ="+mean);
			continue; //continue;
		}
		
		if (matchCount>50) {
			console.log('discover: matchCount= '+matchCount + " matchSum=" + matchSum+' n='+n+' t='+t+' c='+c );
			console.log(newSuggestions);
			return;
		}


		//update allocations
		for (var c in newSuggestions.params.active) {											// sweep through all labels in full allocations
			category=newSuggestions.params.active[c];
			labels = newSuggestions.allocations[category];
			for (var l in labels) {
				for (var i in userInfo.novels[n][category]) {
					if (userInfo.novels[n][category][i] == l) {								// test for a match and substract mean
						newSuggestions.allocations[category][l] -= mean;
						//if(n==38) console.log('discover: i='+i+' l='+l+' mean='+mean);
					}
				}
				// Error is incremented by the square of allocation value (Preferred or Other)
				E += newSuggestions.allocations[category][l]*newSuggestions.allocations[category][l];
				//if(n==38) console.log('discover: n='+n+' category=' + category+' l='+l+' i='+userInfo.novels[n][category][i]+' E='+E+' alloc='+newSuggestions.allocations[category][l]); //i='+userInfo.novels[n][category][i]+' E='+E);
			}
		}
		
		//if (n==38) {	// Breast Cancer
		//	console.log('discover: n=Breast Cancer n='+n+' matchCount='+matchCount+' matchSum='+matchSum+ ' mean='+mean+' countSolve='+userInfo.bestSuggestions.eval.countSolve+' E='+E);
		//	console.log(newSuggestions);
		//	return;
		//}
		
		newSuggestions.eval.finalE = E;
		newSuggestions.plan.push({"Charity Name": userInfo.novels[n]["Charity Name"], "Amount": mean});
		newSuggestions.eval.countSuggestions+=1;
		userInfo.bestSuggestions.eval.countSolve+=1;														// global variable
		newSuggestions.eval.totalValue+=mean;
		
		candidateSuggestions.push(newSuggestions);
		
		// reset accumulators
		var matchCount=0;
		var matchSum=0;
		var E=0;
		
		//console.log("discover: n=" +n+" mean=" + mean +" E="+E);
	}
	
	// rank candidate suggestions by error (low to high)
	
	candidateSuggestions.sort( (a,b)=>{return (a.eval.finalE - b.eval.finalE);}) 					// TODO: split ties on popularity
	
	//console.log('discover: candidateSuggestions.length= '+candidateSuggestions.length);

	// Iterate over each candidate and invoke discover again on the top N candidates
	
	for(var s=0; s<Math.min(candidateSuggestions.length,suggestions.params.searchWidth); s++) {
		discover(candidateSuggestions[s]);
	}
	
	return;
}

function initOptimise(budget, maxTrans) {
	/* function to initialise and invoke recursive solver
	Once it has a solution, it then invokes the display function.
	*/
	
	userInfo.bestSolution = 
		{
			"params": {
				"budget": Number(budget)||1000,
				"maxTrans": Number(maxTrans)||7,
				"active": ["Goals", "Places", "Beneficiaries"],
				"maxSolve": 1e5,
				"searchWidth": 20
			},
			"eval": {
				"baseQ": 0,						// placeholder
				"finalQ": 0,
				"totalValue": 0,
				"countTrans": 0,
				"countSolve": 0,				// use this globally
				"minVal": 0,
				"targLabel" : '',
				"targCategory" : ''
			},
			"plan": [
//				{"Charity Name": "Oxfam", "Amount": 300},
//				{"Charity Name": "Red Cross", "Amount": 100},
//				{"Charity Name": "UniMelb", "Amount": 400},
//				{"Charity Name": "CERES", "Amount": 200},
//				{"Charity Name": "RSPCA", "Amount": 300}
			],
			"allocations": {}
		};

	// create preferred list
	var preferred=[];
	
	for (var c in userInfo.bestSolution.params.active) {
		alloc = userInfo.allocations[userInfo.bestSolution.params.active[c]];
		for (var l=0; l<alloc.length; l++) {
			if (alloc[l]["Preferred"] != 0) {
				preferred.push(alloc[l]["Category"]);
			}
		}
	}
	userInfo.preferred=preferred;
	
	
	// Set base allocations

	userInfo.bestSolution.allocations = userInfo.allocations;
	
	var newSolution = userInfo.bestSolution;
	
	var result = calculateQ(userInfo.bestSolution);
	
	console.log("New Q="+result.Q);
	
	userInfo.bestSolution.eval.baseQ = result.Q;
	userInfo.bestSolution.eval.minVal = result.minVal;
	userInfo.bestSolution.eval.targLabel = result.targLabel;
	userInfo.bestSolution.eval.targCategory = result.targCategory;
	
	userInfo.bestSolution.eval.finalQ=1e10;
	
	optimise(newSolution);
	
	console.log("initOptimise: completed search. Best solution is: ")
	console.log(userInfo.bestSolution);
	
	displayPlanner("Optimise");
	
	return;
}

function optimise(solution) {
	
	/* function outputs a set of suggested future transactions using a dynamic programming heuristic
	
		Take in a solution object, returns a solution object
	
	Given:
	
		A set of historical transactions (userInfo.transactions)
		A set of preferred labels (userInfo.details)
		A set of optimisation constraints (budget and maxTrans and maxSolve)
		A set of candidate charities to transact on (candidates)
		A hierarchical objective function:
			(1) Minimise sum value of non-preferred labels greater than smallest preferred attribute (Q)
			(2) To split any ties, select the lowest total value of transactions (totalValue)
			(3) To split any further ties, select solution with fewest number of charities (countTrans)
	
	Heuristic - branch-and-bound on depth-first-search via tail recursion:
	
		Test if any constraints broken; if so halt
		
		Test if current solution is globally best; if so, replace

		Select worst preferred attribute [targLabel]
			Identify lowest-ranked preferred attribute (within each active group)
			Select attribute from group with greatest Q
			
		Compute list of non-preferred attributes greater than the smallest preferred attribute, plus a buffer
			Buffer is the gap between smallest preferred attribute and greatest non-preferred attribute (G) (or budget, if greater)
			
		Select from the candidate charities all those with the target attribute
		
		Calculate Q if the candidate transaction took place with value of G
		
		Rank each candidate by Q; split ties based on totalValue
			
*/

	
	// test if constraints broken - if so, do not continue
	
	if (solution.eval.totalValue>solution.params.budget || solution.eval.countTrans>solution.params.maxTrans || userInfo.bestSolution.eval.countSolve>solution.params.maxSolve) {
		//	console.log("Solve: totalValue= "+solution.eval.totalValue+ " countTrans="+solution.eval.countTrans+" countSolve="+userInfo.bestSolution.eval.countSolve+ " finalQ="+solution.eval.finalQ);
		return;
	}
	
	// test if new solution is better than bestSolution - if so, replace and keep on looking
	
	var winner=false;
	
	if (solution.eval.finalQ < userInfo.bestSolution.eval.finalQ)
		winner=true;
	
	if (solution.eval.finalQ == userInfo.bestSolution.eval.finalQ && solution.eval.totalValue < userInfo.bestSolution.eval.totalValue)
		winner=true;
	
	if (solution.eval.finalQ == userInfo.bestSolution.eval.finalQ && solution.eval.totalValue == userInfo.bestSolution.eval.totalValue && solution.eval.countTrans < userInfo.bestSolution.eval.countTrans)
		winner=true;

	if (winner) {
		userInfo.bestSolution = solution;
		console.log("Optimise: New winner found. finalQ="+solution.eval.finalQ+" totalValue="+solution.eval.totalValue);
	}

	var minVal = solution.eval.minVal;
	var targLabel = solution.eval.targLabel;
	var targCategory = solution.eval.targCategory;
	var preferred = userInfo.preferred;
	
	//find maximum non-preferred label in the target category (needed to calculate G)
	
	var maxVal=0;
	var maxLabel="";
	alloc = solution.allocations[targCategory];
	for (var l=0; l<alloc.length; l++) {
		if (alloc[l]["Other"] != 0 && alloc[l]["Other"] > maxVal) {
				maxVal = alloc[l]["Other"];
				maxLabel = alloc[l]["Category"];
		}
	}
	
	//console.log("Solve: maxLabel= "+maxLabel+"  maxVal= "+maxVal);

	// calculate G, the amount to transact ie to lift lowest preferred to greater than highest non-preferred (in category)
	
	var G = Math.min(maxVal - minVal + 0.1, solution.params.budget - solution.eval.totalValue);		// upto remaining budget amount
	
	if (G<=0.1) { 																					// if minVal>maxVal then abandon as already optimal
		//console.log("Solve: G="+G+" minVal="+minVal+" maxVal="+maxVal);
		return;
	}
	
	// build target candidates list
	
	var candidateSolutions = [];
	var labels=[];
	var newAlloc=[];
	var result={};
	
	// filter on Top 1000 candidates that include target label
	// add this to the plan
	// evaluate Q
	// add to targCandidates arrays
	
	for (var a=1; a<candidates.length; a++) {											// a=1 because header line
		if (candidates[a][targCategory].includes(targLabel)) {							// only proceed with candidates that have the target label
			var newSolution=JSON.parse(JSON.stringify(solution));						// deep-copy the original solution
			for (var c in solution.params.active) {										// sweep through all labels and update allocations
				labels = candidates[a][solution.params.active[c]];	
				for (var l=0; l<labels.length; l++) {
					if(labels[l]=='')													// skip missing labels in the category
						break;
					var foundLabel=false;
					alloc=solution.allocations[solution.params.active[c]];
					newAlloc=newSolution.allocations[solution.params.active[c]];
					for (var n=0; n<alloc.length; n++) {								// look for label in existing allocations
						if(alloc[n]["Category"]==labels[l]) {
							foundLabel=true;
							if (preferred.includes(labels[l]))
								newAlloc[n]["Preferred"]+=G;
							else
								newAlloc[n]["Other"]+=G;
						}
					}
					if (!foundLabel) {																 			// if not already present, add it
						if (preferred.includes(labels[l]))
								newAlloc.push({"Category":labels[l],"Other":0,"Preferred":G});
							else
								newAlloc.push({"Category":labels[l],"Other":G,"Preferred":0});
					}
				}
			}
			
			result = calculateQ(newSolution);
			newSolution.plan.push({"Charity Name": candidates[a]["Charity Name"], "Amount": G});
			newSolution.eval.totalValue += G;
			newSolution.eval.countTrans += 1;
			userInfo.bestSolution.eval.countSolve += 1;
			newSolution.eval.finalQ = result.Q;
			newSolution.eval.minVal = result.minVal;
			newSolution.eval.targLabel = result.targLabel;
			newSolution.eval.targCategory = result.targCategory;
			
			candidateSolutions.push(newSolution);
		}
	}
	// sort each targeted candidate by Q value, lowest to highest; if equal Q, sort by totalValue lowest to highest
	
	candidateSolutions.sort( (a,b)=>{if (a.eval.finalQ===b.eval.finalQ) return (a.eval.totalValue - b.eval.totalValue); return (a.eval.finalQ - b.eval.finalQ);})
	
	// Iterate over each target candidate and invoke solve again on the top N candidates
	
	for(var s=0; s<Math.min(candidateSolutions.length,solution.params.searchWidth); s++) {
		optimise(candidateSolutions[s]);
	}
	
	return;
}

function calculateQ(solution) {

	// given a solution object, calculates the Q score
	// this is the sum of non-preferred labels greater than the least-valued preferred label in each category

	// Select lowest-value preferred label across all categories
	// (and build preferred list along the way)
	
	var minVal=[];
	var targLabel=[];
	var targCategory='';
	var alloc=[];
	var preferred=[];
	
	for (var c in solution.params.active) {
		alloc = solution.allocations[solution.params.active[c]];
		for (var l=0; l<alloc.length; l++) {
			if (alloc[l]["Preferred"] != 0) {
				//preferred.push(alloc[l]["Category"]);
				if (!minVal[c] || alloc[l]["Preferred"] < minVal[c]) {
					minVal[c] = alloc[l]["Preferred"];
					targLabel[c] = alloc[l]["Category"];
				}
			}
		}
	}
	
	// sweep through allocations and accumulate into Q
	
	var Q=0;
	
	var globalMin=1e10;
	var targ=0;
	
	for (var c in solution.params.active) {
		if (minVal[c]<globalMin) {
			globalMin = minVal[c];
			targ = c;
		}
		alloc = solution.allocations[solution.params.active[c]];
		for (var l=0; l<alloc.length; l++) {
			if (alloc[l]["Other"] != 0 && alloc[l]["Other"] > minVal[c]) {
					Q += alloc[l]["Other"];
			}
		}
	}
	
	return {"Q": Q, "minVal": minVal[targ], "targLabel": targLabel[targ], "targCategory": solution.params.active[targ]};
}


// copy of reference data
// sourced from Google Sheets

const refData = {
'Goals': {	
	'Animals' :'Preventing or relieving suffering of animals',
	'Culture' :'Advancing culture',
	'Education' :'Advancing education',
	'Health' :'Advancing health',
	'Advocacy' :'Promote or oppose a change to the law policy or practice',
	'Environment' :'Advancing the natural environment',
	'HumanRights' :'Promoting or protecting human rights',
	'GeneralPublic' :'Purposes beneficial to the general public',
	'Reconcilation' :'Promoting reconciliation mutual respect and tolerance',
	'Religion' :'Advancing religion',
	'Welfare' :'Advancing social or public welfare',
	'Security' :'Advancing the security or safety of Australia}'},
'Places': {	
	'ACT' :'Australian Capital Territory',
	'NSW' :'New South Wales',
	'NT' :'Northern Territory',
	'QLD' :'Queensland',
	'SA' :'South Australia',
	'TAS' :'Tasmania',
	'VIC' :'Victoria',
	'WA' :'Western Australia'},
'Beneficiaries': {	
	'AboriginalTSI' :'Aboriginal or Torres Straight Islander',
	'Adults' :'Adults',
	'Elderly' :'Aged persons',
	'Children' :'Children',
	'Overseas' :'Communities overseas',
	'EarlyChildhood' :'Early childhood',
	'Ethnic' :'Ethnic groups',
	'Families' :'Families',
	'Females' :'Females',
	'Poverty' :'Financially disadvantaged',
	'LGBTQIA+' :'Gay lesbian and bisexual',
	'General' :'General communities',
	'Males' :'Males',
	'Refugees' :'Migrants refugees and asylum seekers',
	'Others' :'Other beneficiaries',
	'Charities' :'Other charities',
	'Homeless' :'People at risk of homelessness',
	'Illness' :'People with chronic illnesses',
	'Disabled' :'People with disabilities',
	'Offenders' :'Pre or post release offenders',
	'Rural' :'Rural regional and remote communities',
	'Unemployed' :'Unemployed persons',
	'Veterans' :'Veterans or their families',
	'CrimeVictims' :'Victims of crime',
	'Disasters' :'Victims of disasters',
	'Youth' :'Youth'} };
	
var refDataFlat = {};
for(var c in refData)
	for (var u in refData[c])
		refDataFlat[u]=refData[c][u];