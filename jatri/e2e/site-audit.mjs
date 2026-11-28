// Local browser fixture only. Never point the audit at a hosted deployment.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { encode } from "next-auth/jwt";

const deps = createRequire(resolve(process.env.AUDIT_DEPS || "/tmp/jaatri-a11y", "package.json"));
const { chromium } = deps("playwright-core");
const axe = deps("axe-core");
const bundledChromium = process.env.AUDIT_CHROMIUM ? null : deps("@sparticuz/chromium");
const chromiumBin = bundledChromium?.default ?? bundledChromium;
const origin = "http://127.0.0.1:" + (process.env.AUDIT_PORT || "3498");
const fixtureSecret = "local-fixture-only";
const browser=await chromium.launch({executablePath:process.env.AUDIT_CHROMIUM || await chromiumBin.executablePath(),args:[...(chromiumBin?.args ?? ['--no-sandbox']), '--no-proxy-server']});
const ride={_id:'fixture',user:{_id:'rider',name:'Rider Fixture'},driver:{_id:'partner',name:'Driver Fixture'},vehicle:{vehicleModel:'Fixture Cab',number:'AS 00 ZZ 0000'},pickupAddress:'Fixture start',dropAddress:'Fixture end',pickupLocation:{coordinates:[91.73,26.15]},dropLocation:{coordinates:[91.74,26.16]},fare:250,status:'confirmed',paymentStatus:'cash',userMobileNumber:'',driverMobileNumber:'',pickupOtp:'0000'};
const pages={
  guest:['/','/book','/booking','/bookings','/explore','/fleet','/search','/settings','/faq','/safety','/privacy','/photo-credits','/contact','/terms','/payment-terms','/cancellation-refund','/partner-terms','/cookies','/grievance','/group/join?token=fixture','/not-a-jaatri-page','/track/fixture'],
  user:['/profile','/wallet','/referral','/checkout?pickup=Fixture+start&drop=Fixture+end&pickupLat=26.15&pickupLng=91.73&dropLat=26.16&dropLng=91.74','/ride/fixture'],
  vendor:['/partners/dashboard','/partner/active-ride','/partner/bookings','/partner/pending-requests','/partner/wallet','/partner/onboard','/partner/onboard/vehicle','/partner/onboard/documents','/partner/onboard/bank'],
  admin:['/admin','/admin/dashboard','/admin/pricing','/admin/students','/admin/safety','/admin/withdrawals','/admin/activity','/admin/vehicles/fixture','/admin/vendors/fixture','/video-kyc/fixture'],
};
const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
const out=[];
const only = process.env.AUDIT_ONLY;
for(const [width,theme] of [[320,'dark'],[1280,'light']]){
 for(const [role,allPaths] of Object.entries(pages)){
  const paths = only ? allPaths.filter((path) => path.startsWith(only)) : allPaths;
  if (!paths.length) continue;
  const context=await browser.newContext({viewport:{width,height:740},colorScheme:theme,reducedMotion:'reduce',serviceWorkers:'block'});
  const uid=role==='vendor'?'partner':role==='admin'?'admin':'rider';
  const user={id:uid,_id:uid,name:'Test Account',email:'fixture@example.invalid',role,isMobileVerified:true};
  if(role!=='guest'){const salt='authjs.session-token';await context.addCookies([{name:salt,url:origin,value:await encode({salt,secret:fixtureSecret,token:{...user,lastRoleCheck:Date.now()}})}]);}
  await context.addInitScript(()=>{sessionStorage.setItem('jaatri_splash_seen','true');if(!location.search.includes('audit-cookie'))localStorage.setItem('ridenow_cookie_consent_v1','{}')});
  await context.route('**/*',async R=>{
    const u=new URL(R.request().url()); if(u.origin!==origin)return R.abort();
    if(!u.pathname.startsWith('/api/'))return R.continue();
    let j={success:true,bookings:[],items:[],vehicles:[],transactions:[],data:[],balance:250,credits:0,results:[],predictions:[]};
    const p=u.pathname;
    if(p.endsWith('/session'))j=role==='guest'?{}:{user};
    else if(p==='/api/admin/dashboard')j={stats:{totalVendors:1,approved:1,rejected:0,pending:0},pendingVendors:[],pendingVehicles:[]};
    else if(p.includes('video-kyc/pending'))j=[];
    else if(p==='/api/admin/pricing')j={configs:[{vehicleType:'car',version:null,baseFare:100,pricePerKm:15,platformFee:10,taxRate:0.05,multiplier:1,minDistance:0,maxDistance:150}]};
    else if(p==='/api/admin/students')j={students:[]};
    else if(p==='/api/admin/safety/incidents')j={incidents:[]};
    else if(p==='/api/admin/withdrawals')j={withdrawals:[]};
    else if(p==='/api/admin/audit-logs')j={logs:[],pagination:{pages:1}};
    else if(p==='/api/user/referral')j={success:true,referralCode:'FIXTURE',shareUrl:origin,monthlyAllowance:{completedThisMonth:0,maxMonthly:5,remainingThisMonth:5},stats:{totalReferrals:0,successfulReferrals:0,totalEarnings:0,rewardPerReferral:50,refereeDiscount:30,minFareRequired:100}};
    else if(p==='/api/user/family')j={success:true,family:null};
    else if(p==='/api/places' && u.searchParams.get('action')==='autocomplete')j={status:'OK',predictions:[
      {place_id:'chip-a',title:'Fixture North',description:'Fixture North',lat:26.15,lng:91.73,city:'Fixture City',state:'Assam',postalCode:'781001'},
      {place_id:'chip-b',title:'Fixture South',description:'Fixture South',lat:26.17,lng:91.74,city:'Fixture City',state:'Assam',postalCode:'781001'}
    ]};
    else if(p==='/api/booking/quote')j={success:true,quote:{estimatedRoute:false,durationMinutes:8,breakdown:{totalFare:250,baseFare:100,distanceFare:150,distanceKm:3,tax:0}}};
    else if(p==='/api/me')j={...user,user};
    else if(p==='/api/booking/fixture'||p==='/api/partner/bookings/active')j=ride;
    else if(p==='/api/booking/fixture/status')j={status:'confirmed'};
    else if(p==='/api/track/fixture')j={success:true,booking:ride};
    return R.fulfill({json:j});
  });
  const page=await context.newPage(); page.on('pageerror',e=>console.error('CLIENT ERROR',page.url(),e.message));
  async function scan(path,variant='initial'){
    const ret=await page.evaluate(async(tags)=>{
      const a=await window.axe.run(document,{runOnly:{type:'tag',values:tags}});
      return {title:document.title,heading:(document.querySelector('h1')||document.querySelector('h2'))?.textContent?.trim(),over:document.documentElement.scrollWidth>innerWidth,main:document.querySelectorAll('main,[role=main]').length,ids:a.violations.map(v=>[v.id,v.nodes.slice(0,12).map(n=>[n.target,n.failureSummary?.slice(0,300)])]),manual:a.incomplete.map(x=>x.id)};
    },tags);
    const row={role,path,variant,width,theme,actual:new URL(page.url()).pathname,...ret};out.push(row);
    console.log(JSON.stringify(row));
  }
  for(const path of paths){
    try{
      await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:12000});
      await page.waitForTimeout(650);
      await page.addScriptTag({content:axe.source}); await scan(path);
    }catch(e){out.push({role,path,width,theme,error:String(e).slice(0,300)})}
  }
  if(role==='guest' && (!only || only === '/')){
    try{
      await page.evaluate(()=>localStorage.removeItem('ridenow_cookie_consent_v1'));
      await page.goto(origin+'/?audit-cookie',{waitUntil:'domcontentloaded'});
      await page.getByRole('button',{name:'Customize Settings',exact:false}).click({timeout:5000});
      await page.addScriptTag({content:axe.source}); await scan('/','cookie preferences');
      await page.getByRole("checkbox", { name: "Performance and telemetry" }).focus();
      await page.keyboard.press("Space");
      assert.equal(await page.getByRole("checkbox", { name: "Performance and telemetry" }).isChecked(),true);
      await page.getByRole("button", { name: "Save choice" }).click();
      assert.equal(await page.locator(".jaatri-skip-link").evaluate(el=>el===document.activeElement),true);
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("main").evaluate(el=>el===document.activeElement),true);
      await page.getByRole("button", { name: "অসমীয়া", exact: true }).last().click();
      const translated=page.locator("h1:visible [lang='as']").first();
      await translated.waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"),"en");
      await page.reload({waitUntil:"domcontentloaded"});
      await translated.waitFor();
      await page.goto(origin+"/settings");
      const modalTrigger=page.getByRole("button", {name:/^Home(?: |$)/i}).first();
      await modalTrigger.waitFor({ state: "visible" });
      {
        await modalTrigger.focus();
        await page.keyboard.press("Enter");
        const dialog=page.getByRole("dialog", { name:"Set Home Address" });
        await dialog.waitFor();
        assert.equal(await dialog.getByRole("textbox",{name:"Home address"}).count(),1);
        await page.addScriptTag({content:axe.source}); await scan('/settings','home address dialog');
        await page.keyboard.press("Escape");
        await dialog.waitFor({state:"hidden"});
        assert.equal(await modalTrigger.evaluate(el=>el===document.activeElement),true);
      }
    }catch(e){out.push({role,path:'/',width,theme,error:String(e).slice(0,300)})}
  }
  if(role==='guest' && only === '/book') {
    try {
      await page.goto(origin+'/book',{waitUntil:"domcontentloaded"});
      const destination=page.getByLabel("Drop location",{exact:true}).filter({visible:true});
      await destination.fill("Fixture");
      const second=page.getByRole("button",{name:/Fixture South/}).filter({visible:true});
      await second.waitFor();
      await second.focus();
      await page.keyboard.press("Enter");
      await destination.waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('input[aria-label="Drop location"]')].some(el=>el.value==="Fixture South"));
      await page.addScriptTag({content:axe.source}); await scan("/book","keyboard-select second destination");
    } catch(e) { out.push({role,path:"/book",variant:"destination keyboard",width,theme,error:String(e).slice(0,300)}); }
  }
  if(role==='admin' && (!only || only === '/admin/pricing')){
    try {
      await page.goto(origin+'/admin/pricing',{waitUntil:"domcontentloaded"});
      const fare=page.getByRole("spinbutton",{name:"Base fare (₹)"});
      await fare.fill("105",{timeout:5000});
      const trigger=page.getByRole("button",{name:"Review changes"});
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog=page.getByRole("dialog",{name:/review car fare changes/i});
      await dialog.waitFor();
      assert.equal(await dialog.getByRole("button",{name:"Save rates"}).isDisabled(),true);
      await dialog.getByRole("textbox",{name:"Reason for the audit log"}).fill("Fixture accessibility check");
      await page.addScriptTag({content:axe.source}); await scan("/admin/pricing","fare review dialog");
      await page.keyboard.press("Escape");
      await dialog.waitFor({state:"hidden"});
      assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    } catch(e) { out.push({role,path:"/admin/pricing",variant:"fare review keyboard",width,theme,error:String(e).slice(0,300)}); }
  }
  await context.close();
 }
}
await browser.close();
fs.writeFileSync(process.env.AUDIT_OUTPUT||'/tmp/jaatri-site-audit.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({ scans: out.length, fixtureErrors: out.filter(row => row.error).length, automatedViolations: out.filter(row => row.ids?.length).length }));
if (!out.length || out.some(row => row.error || row.ids?.length)) process.exitCode = 1;
