/* Main scripts for DonorBuddy registration page
**
** Form is handled via a POST through a custom Google App Script proxy into the backend spreadsheet
**
*/

const url = "https://script.google.com/macros/s/AKfycbxNZqGv_i47AzZMmWKlWdRGIaJxGBIP7TdhzXBbeVVT02bcVYoGKYXGcand_g63RDQ/exec"; // API endpoint
const formElem = document.getElementById("registrationForm");
const emailInput = document.getElementById("email");
const subbtn = document.getElementById("btn-submit");

$(document).ready(prefillForm);

formElem.addEventListener("submit", (e) => {

	e.preventDefault(); // prevent default behaviour ie disable form submission

	// switch back to Profile tab
	
	$(function () {
		$('#pills-tab a[href="#pills-profile"').tab('show');
	});
	
	// set form elements readonly and disable submit button

	$('#btn-submit').text('Registering ...').prop('disabled','disabled').attr('style','background-color: gray');

	$("#registrationForm :input").prop('readonly', true);
	
	$('#submit-dialog').modal('show');							// show spinner by default

	fetch(url+'?'+getRegistrationData(), {
		method: "GET"
    })
    .then(data => {
		console.log(data);
		formResponseSuccess();
    })
    .catch(err => {
		console.error(err); 
		formResponseError();
	})
})


function getRegistrationData() {

/* retrieve form data from HTML
** process string; comma-separated multiple responses, ampersand-separated
*/

	const f = new FormData(formElem); // FormData API to load the form fields

	const d = [
		f.get('name'),
		f.get('email'),
		f.get('amount'),
		f.getAll('places').join(','),
		f.get('otherPlaces'),
		f.getAll('goals').join(','),
		f.get('otherGoals'),
		f.getAll('beneficiaries').join(','),
		f.get('otherBeneficiaries'),
		['submit'].concat(f.getAll('notifications')).join(','),			// hard-code the submit option
		f.get('consent')].join('&');
		
	//alert(d);

  return d;
}

function formResponseSuccess() {

	$("#registrationForm :input").prop('disabled', true);

	$('#spinner').hide();
	$('#check').show();
	
	$('#btn-submit').text('Registered');

	
	return;
}

function formResponseError() {
	
	$("#registrationForm :input").prop('disabled', true);
	
	$('#spinner').hide();
	$('#error').show();

	$('#btn-submit').text('Failed');
}
	
function prefillForm() {
	// attempt to prefill the form using URL query string
	
	// TODO: grab query string, split it, decode it, grab FormData via API, set as many fields as possible
	
}