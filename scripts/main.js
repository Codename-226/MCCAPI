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




const challenge_field = document.getElementById("challenge_field");
const challenge_deck_field = document.getElementById("challenge_deck_field");
const challenge_value_field = document.getElementById("challenge_value_field");
const gamertag_field = document.getElementById("gamertag_field");
const store_field = document.getElementById("store_field");
const seasonal_store_field = document.getElementById("seasonal_store_field");
const seasonal_item_field = document.getElementById("seasonal_item_field");
const freemium_item_field = document.getElementById("freemium_item_field");
const output_field = document.getElementById("output_field");

function UI_PostLog(log){
	output_field.value = "Log: " + JSON.stringify(log);
}
async function UI_CGBList(){
	UI_PushJob("fetching CGB...");
	try{
		UI_PostLog(await API_Get_CGBList());
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_ChallengeList(){
	UI_PushJob("fetching challenge list...");
	try{
		UI_PostLog(await API_Get_Challenges());
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_ChallengeUpdate(){
	UI_PushJob("updating challenge progress...");
	try{
		UI_PostLog(await API_Update_Challenges(challenge_deck_field.value, challenge_field.value, challenge_value_field.value));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_PlayerDetails(){
	UI_PushJob("fetching player details...");
	try{
        UI_PostLog(await API_Get_PlayerDetails(await API_Get_PlayfabID(await API_Get_XUID(gamertag_field.value))));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_PlayerUGC(){
	UI_PushJob("fetching player UGC...");
	try{
        UI_PostLog(await API_Get_PlayerFileshare(await API_Get_PlayfabID(await API_Get_XUID(gamertag_field.value))));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_GetUnlocked(){
	UI_PushJob("fetching all unlocks...");
	try{
        UI_PostLog(await API_Get_Unlocks());
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_GetUnlockables(){
	UI_PushJob("fetching all items...");
	try{
        UI_PostLog(await API_Get_UnlockDatabase());
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_GetStoreUnlockables(){
	UI_PushJob("fetching store items...");
	try{
        UI_PostLog(await API_Get_StoreDatabase(store_field.value));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_PurchaseSeasonal(){
	UI_PushJob("pruchasing seasonal item...");
	try{
        UI_PostLog(await API_PurchaseSeasonal(seasonal_store_field.value, seasonal_item_field.value));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_PurchaseFreemium(){
	UI_PushJob("purchasing freemium item...");
	try{
        UI_PostLog(await API_PurchaseFreemium(freemium_item_field.value));
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}
async function UI_UploadCustomizations(){
	UI_PushJob("uploading customizations...");
	try{
        UI_PostLog(await API_UploadCustomizations());
	} catch (ex){UI_PostLog(ex)};
	UI_PopJobs();
}





// NOTE: general sample of all the api stuff
async function PrismarineXBLLogin() {
	UI_PushJob("begining XBL login routine...");
	try{
        // putting these here so any console log outputs are out of the way
        await Storage_GetSpartanToken();
        await Storage_GetPlayfabSessionToken();
        //await API_Get_CGBList();

        // console.log(await API_Get_Challenges());
        // console.log(await API_Update_Challenges("", "", 10));
        // console.log(await API_Update_Challenges("", "", 90));
        // console.log(await API_Get_Challenges());

        // await API_Get_MOTD();
        //await Waypoint_RequestClearance();
        //await API_AccessResource(); // deprecated ??

        // NOTE: worked when i wrote this code. currently not working.???
        //console.log("Gamergotten's XUID: " + await API_Get_XUID("Gamergotten"));
        //console.log("Invalid GT XUID: " + await API_Get_XUID("sdf7bmas92ds91")); // returns undefined

        //console.log(await API_Get_PlayfabID(2535459205023857)); // gamergottens XUID
        //console.log(await API_Get_LocalPlayfabID());

        // console.log("local user's stats")
        // console.log(await API_Get_PlayerDetails(await API_Get_LocalPlayfabID()));
        // console.log("Gamergotten's stats")
        // console.log(await API_Get_PlayerDetails(await API_Get_PlayfabID(2535459205023857)));

        //console.log(await API_Get_PlayerFileshare(await API_Get_PlayfabID(2535459205023857)));
        //console.log(await API_Get_FileshareDetails("b47471ff-d42a-450e-858e-d4974ce7a7be"));

        //console.log(await API_Get_ProfileFromXUID(2535459205023857)); //returns gamertag + profile picture url + gamerscore

        //console.log("player inventory");
        //console.log(await API_Get_Unlocks());
        //console.log("all unlocks");
        //console.log(await API_Get_UnlockDatabase());

        // console.log("season 1 purchaseables");
        // console.log(await API_Get_StoreDatabase("Season1")); // etc... through to "Season8"
        //console.log("the exchange purchaseables");
        //console.log(await API_Get_StoreDatabase("FreemiumStore"));

        //console.log("purchase receipt");
        //console.log(await API_PurchaseSeasonal("Season2", "S2T02"));

        //console.log("purchase receipt");
        //console.log(await API_PurchaseFreemium("POSEBUNDLE_RIFLESALUTE"));
        //console.log(await API_PurchaseFreemium("CUSTOMIZATION_H3S6_VS_MONGOOSE_BLACKRHINE"));

        return;
	}  catch (ex){
		console.log("Xbox access auth process failed." + ex)
        console.log(ex)
	}
	UI_PopJobs();
}

