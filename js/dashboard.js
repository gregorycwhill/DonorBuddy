/* Scripts for DonorBuddy dashboard page
**
** Form is handled via a POST through a custom Google App Script proxy into the backend spreadsheet
**
*/

const url = "https://script.google.com/macros/s/AKfycbypJ2fsPF3Rtw1LrUrhaiDG_Cz_NcSZwvew4kPcUntM-54XM6SytZV-Q46mNxvt_LSX/exec"; // API endpoint
const formElem = document.getElementById("loginForm");
const userID = document.getElementById("userID");
const loginBtn = document.getElementById("btn-login");
var userSheetID = "null";

let params = new URLSearchParams(document.location.search);		// extract 'user' parameter for query string
let userQuery = params.get("user");


$(document).ready(prefillForm);

formElem.addEventListener("submit", (e) => {

	e.preventDefault(); // prevent default behaviour ie disable form submission
	
	// set form elements readonly and disable submit button

	$('#btn-login').prop('disabled','disabled').attr('style','background-color: gray');

	$("#loginForm :input").prop('readonly', true);

	fetchSheetID();
});

async function fetchSheetID() {

    let response = await fetch(url+'?user='+userID.value, {
		method: "GET"});
    let t = await response.text();
	
	//alert(t);
	userSheetID = t;
	if(!t || typeof(t) == 'undefined') {
		alert("User "+userID.value+" was not found. Please try again.");
		
		$('#btn-login').prop('disabled','').attr('style','background-color: secondary');
		$("#loginForm :input").prop('readonly', false);
	}
	
}

	
function prefillForm() {
	// attempt to prefill the form using URL query string
	
	// TODO: grab query string, split it, decode it, grab FormData via API, set as many fields as possible
	
}


if (userQuery) {
	userID.value = userQuery;									// set form value, if found
	loginBtn.click();											// click the login button
}