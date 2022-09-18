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
var debug={};

let params = new URLSearchParams(document.location.search);		// extract 'user' parameter for query string
let userQuery = params.get("user");

$(document).ready(prefillForm);

formElem.addEventListener("submit", (e) => {

	e.preventDefault(); // prevent default behaviour ie disable form submission
	
	// set form elements readonly and disable submit button

	$('#btn-login').prop('disabled','disabled').attr('style','background-color: gray');

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
	
	var h = userInfo.transactions[0];								// grab headers from first row
	
	var data = userInfo.transactions.slice(1);						// grab data from rest of table
	
	// build headers

/*	var hdrs = [];													

	for (var i=0; i<h.length; i++) {
		hide=false;
		fmt='';
		if (h[i]=='PrivateID' || /Total/i.test(h[i]))
			hide=true;
		if(h[i]=='Date')
			fmt = params => dateFormatter(params.value);
		if(i>22)
			fmt = params => percentFormatter(params.value);
		if(h[i]=='Amount')
			fmt = params => currencyFormatter(params.value);
		hdrs.push({'field':h[i],'hide':hide,'valueFormatter':fmt});
	} 


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
		{ field: 'Goals', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Goals of the charity'},
		{ field: 'Places', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Places where the charity operates'},
		{ field: 'Beneficiaries', hide: false, cellRenderer: params => tagRenderer(params), headerTooltip: 'Beneficiaries of the charity'},
		{ field: 'DonorReliance', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, valueFormatter: params => percentFormatter(params.value), headerTooltip: 'Share of income from donations'},
		{ field: 'EmployeeShare', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, filter: 'agNumberColumnFilter', valueFormatter: params => percentFormatter(params.value),headerTooltip: 'Share of expenses going to employees'},
		{ field: 'DonationRank', hide: false, width: 120, type: 'rightAligned', wrapHeaderText: true, filter: 'agNumberColumnFilter', valueFormatter: params => percentFormatter(params.value), headerTooltip: 'Rank within all Australian charities by total donations'},
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

	// move columns into positions
	
	//gridOptions.columnApi.moveColumns(['Date', 'Charity Name', 'Amount'], 0);
	//gridOptions.api.sizeColumnsToFit();

	return;
}


function dateFormatter(params) {
	
	var d = new Date(params);
	return d.toLocaleDateString();
}

function currencyFormatter(params) {
	return "$"+params;
}

function percentFormatter(params) {
	if (!params || params == '')
		return "";
	return String(Math.floor(parseFloat(params)*100+0.5))+"%";
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

	debug=filterInstance;
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
	elem.style.display="block";
	
	//elem.innerHTML = userInfo.transactions[row]['Charity Name'];
	
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
	
	console.log(row);
	elem.style.display="block";
	
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
