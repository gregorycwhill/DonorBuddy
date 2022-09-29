/* Scripts for DonorBuddy dashboard page
**
** Form is handled via a POST through a custom Google App Script proxy into the backend spreadsheet
**
*/

const url = "https://script.google.com/macros/s/AKfycbw9YVa58RhYN_NYEjmZe3vEZcNWYL80gRbyLqHblOHHDK0f0wEaqW9Cmcbp_YReYzi8Hw/exec"; // API endpoint
const formElem = document.getElementById("loginForm");
const userID = document.getElementById("userID");
const loginBtn = document.getElementById("btn-login");
var userInfo = "null";
var gridOptions = {};
var debugO={};
var debugA=[];

let params = new URLSearchParams(document.location.search);		// extract 'user' parameter for query string
let userQuery = params.get("user");

$(document).ready(prefillForm);

formElem.addEventListener("submit", (e) => {

	e.preventDefault(); // prevent default behaviour ie disable form submission
	
	// set form elements readonly and disable submit button

	//$('#btn-login').prop('disabled','disabled').attr('style','background-color: gray').text('logout');
	
	$('#btn-login').attr('style','background-color: gray').text('logout').click(function(){location.href="dashboard.html";});
	
	$("#loginForm :input").prop('readonly', true);

	fetchUserInfo();
});

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
	
	displayTracking();
	
	displayAnalysis();
	
	
	displayPlanning();
	
	return;
}

function displayTracking(){
	
	// function to tranform transaction data and create dataGrid for browsing;
	// also creates inspector panel to display charity details
	
	const h = userInfo.transactions[0];								// grab headers from first row
	
	const data = userInfo.transactions.slice(1);						// grab data from rest of table
	
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
			inspectCharity(params.node.id);
		}
	};

   // get div to host the grid
   const eGridDiv = document.getElementById("transactionGrid");
   // new grid instance, passing in the hosting DIV and Grid Options
   new agGrid.Grid(eGridDiv, gridOptions);

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
	for(var i=0; i<params.value.length-1; i++) {				// drop last item - always empty
		
		html+='<span class="btn btn-sm btn-outline-info small" title="click to filter" onclick="toggleTag(\''+params.value[i]+'\',\''+params.column.colId+'\');">' + params.value[i] + '</span>&nbsp;';
	}
	return html;
}
	
function toggleTag(tag, col) {
	
	//alert('toggleTag: tag: ' +tag+ ' col: '+col);
	
	// Get a reference to the filter instance
	const filterInstance = gridOptions.api.getFilterInstance(col); 

	debugO=filterInstance;
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

function inspectCharity(id) {
	
	const row = parseInt(id)+1;
	elem = document.getElementById('inspector');
	
	const u = userInfo.transactions[row];
	
	// tally all gifts to charity
	
	var giftTotal=0; var giftCount=0;
	
	for(i in userInfo.transactions) {
		if (userInfo.transactions[i].ABN == u.ABN) {
			giftTotal += userInfo.transactions[i].Amount;
			giftCount++;
		}
	}		
	
	const mapping = {
		"insp-name": u['Charity Name'],
		"insp-web": u['Website'],
		"insp-acnc": u['ACNC ID'],
		"insp-abr": u['ABN'],
		"insp-location": u['Location'],
		"insp-goals": u['Goals'].join(' '),
		"insp-places": u['Places'].join(' '),
		"insp-beneficiaries": u['Beneficiaries'].join(' '),
		"insp-tax": u['Tax Status'],
		"insp-reliance": percentFormatter(u['DonorReliance']),
		"insp-share": percentFormatter(u['EmployeeShare']),
		"insp-rank": percentFormatter(u['DonationRank']),
		"insp-total": currencyFormatter(giftTotal),
		"insp-count": giftCount
		};
	
	for (var i in mapping) {
		switch(i) {
			case 'insp-web':
				document.getElementById(i).href='https://'+mapping[i];
			break;
			case 'insp-acnc':
				document.getElementById(i).href='https://www.acnc.gov.au/charity/charities/'+mapping[i]+'/profile';
			break;
			case 'insp-abr':
				document.getElementById(i).href='https://www.abr.business.gov.au/ABN/View?id='+mapping[i];
			break;
			default:
				document.getElementById(i).innerHTML = mapping[i];
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
	var uniqTax = [''];
	var totalAmount = 0;
	
	uniqMonths=['2022-07','2022-08','2022-09','2022-10','2022-11','2022-12','2023-01','2023-02','2023-03','2023-04','2023-05','2023-06','2023-07','2023-08','2023-09','2023-10','2023-11','2023-12']; // TODO: automate

	for (var i in data) {
		
		//var month = data[i]['Date'].substr(0,7);
		var charity = data[i]['Charity Name'];
		var tax = data[i]['Tax Status'];
		totalAmount += data[i]['Amount'];
		
		//if (!uniqMonths.includes(month))
		//	uniqMonths.push(month);
	
		if (!uniqCharities.includes(charity))
			uniqCharities.push(charity);
		
		if (!uniqTax.includes(tax))
			uniqTax.push(tax);
	}
	
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
		data: transData,
		series: seriesCumulative
	}
	
	//debugA = seriesCumulative;
	//debugA = transData;
	
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
	
	for (var c in uniq) {												// iterate through each category dimension (goals, place, beneficiaries)

		// accumulate giving amount values by category
		for (var i in data) {
			data[i][c].forEach(
				(x) => {
					if (uniq[c][x])
						uniq[c][x] += data[i]['Amount'];
					else 
						uniq[c][x] = data[i]['Amount']
				});
		}
		
		debugO = uniq;
		
		chartData[c]=[];
		
		for (var u in uniq[c])
			if (userInfo['details'][c].includes(u.toLowerCase())) {					// user's preferred category value
				chartData[c].push({'Category': u, 'Other': '', 'Preferred': uniq[c][u]});
				//chartData[c].push({'Category': u, 'AmountPref': uniq[c][u]});
			}
			else {
				chartData[c].push({'Category': u, 'Other': uniq[c][u], 'Preferred': ''});
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
	
	debugA = chartData;
	
	// Build and display Summary panel
	
	const elem = document.getElementById('summary');
	
	const mapping = {
		"summary-total": currencyFormatter(totalAmount,2),
		"summary-gift": data.length,
		"summary-charities": uniqCharities.length,
		"summary-monthly": currencyFormatter(totalAmount/uniqMonths.length,2),
		"summary-amount": currencyFormatter(totalAmount/data.length,2),
		"summary-tax": currencyFormatter(transData[transData.length-1]['Item 1'],2),
		"summary-days": Math.round((uniqMonths.length*30.5)/data.length),
		"summary-goal": chartData['Goals'][0]['Category'],
		"summary-place": chartData['Places'][0]['Category'],
		"summary-beneficiary": chartData['Beneficiaries'][0]['Category'],
		};
	
	//var a=0; var t=transData[transData.length-1]; alert(uniqTax+' ---'+ uniqTax.length);
	//alert(uniqTax.forEach(function(e){if (!e) return; if(t[e])alert(' ---' +e)}));
	
	for (var i in mapping) {
		switch(i) {
			case 'insp-web':
				document.getElementById(i).href='https://'+mapping[i];
			break;
			case 'insp-acnc':
				document.getElementById(i).href='https://www.acnc.gov.au/charity/charities/'+mapping[i]+'/profile';
			break;
			case 'insp-abr':
				document.getElementById(i).href='https://www.abr.business.gov.au/ABN/View?id='+mapping[i];
			break;
			default:
				document.getElementById(i).innerHTML = mapping[i];
		}
	}
	
	elem.style.display='block';
	
	return;
}

function displayPlanning() {
	
	return;	
}

function prefillForm() {
	// attempt to prefill the form using URL query string
	
	// TODO: grab query string, split it, decode it, grab FormData via API, set as many fields as possible
	
}


if (userQuery) {
	userID.value = userQuery;									// set form value, if found
	loginBtn.click();											// click the login button
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