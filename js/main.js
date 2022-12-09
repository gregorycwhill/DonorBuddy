/* Main scripts for DonorBuddy registration page
**
** Form is handled via a POST through a custom Google App Script proxy into the backend spreadsheet
**
*/

const url = "https://script.google.com/macros/s/AKfycbyiAW8ZZzuRjWhX_3rUdHYfcXFMVrnGqv_8Wyj2znpfpg23_LAId0lDUtLFkmjRzyHL/exec"; // API endpoint
const formElem = document.getElementById("registrationForm");
const emailInput = document.getElementById("email");
const subbtn = document.getElementById("btn-submit");

$(document).ready(prefillForm);

var opts=[['Prefer','Avoid'],['Organisation','Places','Goals','Beneficiaries', 'Keywords']];

SS={};

var ssObj = {};

for (var i in opts[0]) {
	for (var j in opts[1]) {
		ssObj = {
			select: '#'+opts[0][i].toLowerCase()+opts[1][j],
			events: {
				afterChange: (newVal) => {
					swapOptions(newVal)
					},
			},
			settings: {
				placeholderText: opts[0][i]+' these '+opts[1][j].replace('Organisation','Organisation types'),	// slight tweak for Organisation
				allowDeselect: true,
				closeOnSelect: false,
				showOptionTooltips: true,
			}
		};
		if (opts[1][j]=='Keywords') {
			// for Keywords selector, let users add the new keyword
			// unless it already exists, to avoid duplicates
			Object.assign(ssObj['events'],{
				addable: function (val) { 
					var tag=val.toLowerCase().replace(/\s/ig,'')
					var vals=[];
					var data=[];
					for (var i in opts[0]) {
						data = SS[opts[0][i]+'Keywords'].getData();
						for (d in data)
							vals.push(data[d].value);
					}
					
					if (vals.includes(tag))
						return false;
				
				// add to the complementary select list
					curr=0;
					if (document.getElementsByClassName('ss-main')[8].classList.length==4)		// CSS hacking to find out which Keyword Selector we're working with
						comp=1;

					SS[opts[0][comp]+'Keywords'].addOption({text: val, value: tag});

					return tag;
				},
				beforeClose: () => { 							// remove the null entries introduced
					for(var i in opts[0]) { 
						var data=SS[opts[0][i]+'Keywords'].getData(); 
						SS[opts[0][i]+'Keywords'].setData(data.filter((x)=>{return x.value!='';}));
					}
				}
			});
			
			Object.assign(ssObj['settings'], {
				searchText:	'No keywords yet',
				searchPlaceholder: 'Enter keyword here and click + button on right'
			});
		}
		
		SS[opts[0][i]+opts[1][j]] = new SlimSelect(ssObj);
	}
	
}




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

function swapOptions(newVal) {
	
	// Use the shorter value for the tags in the multiselect
	// Enforce the logic that a tag can't be in both prefer and avoid list

	var id;
	var tags=document.getElementsByClassName('ss-value');
	
	//console.log(newVal);
	//console.log(tags);
	
	if (newVal.length==0)
		return;
	
	var curr='';
	var comp='';
	
	for(var i in newVal) {
		id = newVal[i].id;
		for(var t in tags) {
			if (tags[t].dataset.id==id) {
				tags[t].firstChild.innerText = newVal[i].value;
				curr = tags[t].parentNode.parentNode.parentNode.children[1].name;
				break;
			}
		}

		comp = curr.match(opts[0][0].toLowerCase())!=null?curr.replace(opts[0][0].toLowerCase(),opts[0][1].toLowerCase()):curr.replace(opts[0][1].toLowerCase(),opts[0][0].toLowerCase());
		comp = comp[0].toUpperCase()+comp.slice(1);
		curr = curr[0].toUpperCase()+curr.slice(1);
	}
	
	var compSet = SS[comp].getSelected();
	var currSet = SS[curr].getSelected();
	
	// Enforce the logic that a tag can't be in both prefer and avoid list
	
	if (currSet.length==0 || compSet.length==0)
		return;
	
	newCompSet=[];

	for (var i in compSet)
		if (!currSet.includes(compSet[i]))
			newCompSet.push(compSet[i]);
	
	//console.log(newCompSet);
	SS[comp].setSelected(newCompSet);
	
	return;
}