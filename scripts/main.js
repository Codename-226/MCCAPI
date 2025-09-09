/*
-- launch non CORS thing
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir=C:\msedge-dev-data\ --disable-web-security
-- launch web server thing
http-server -p 8080 -c-1
*/

const loading_UI = document.getElementById("loading_UI");
const sisu_code_field = document.getElementById("sisu_code_field");
const sisu_code_ui = document.getElementById("sisu_code_ui");
const loading_context = document.getElementById("loading_context");
const loading_context_count = document.getElementById("loading_context_count");


signin_job_count = 0;
function UI_PushJob(context){
	signin_job_count += 1;
	// update job counter
	loading_context_count.textContent = "" + signin_job_count + " Job(s)";
	loading_context.textContent = context;
	if (signin_job_count == 1){
		// show loading UI blocker 
		loading_UI.style.visibility = "visible";
	}
}
function UI_PopJobs(){
	signin_job_count = 0
	loading_UI.style.visibility = "collapse";
}

function UI_SisuCodePrompt() {
	// bring up the code submit page !!!
	UI_PushJob("Awaiting user to submit auth code");
	sisu_code_ui.style.visibility = "visible";

}


function UI_SisuCodeSubmit() {
	sisu_code_ui.style.visibility = "collapse";
	Sisu_SubmitCode(sisu_code_field.value);
}



async function PrismarineXBLLogin() {
	UI_PushJob("begining XBL login routine...");
	const xsts = await getXboxToken();
	console.log(xsts);
	UI_PopJobs();
}

