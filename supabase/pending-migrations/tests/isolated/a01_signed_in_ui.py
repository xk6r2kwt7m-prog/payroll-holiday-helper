import asyncio, json, subprocess, time
from playwright.async_api import async_playwright
SHOT='/tmp/browser/a01/'
def jwt(sub,email): return subprocess.run(['node','-e',f"import('/tmp/iso/ui/jwt.mjs').then(m=>console.log(m.sign({{sub:'{sub}',email:'{email}',role:'authenticated',aud:'authenticated',exp:2000000000}})))"],capture_output=True,text=True).stdout.strip()
def db(q): return subprocess.run(['psql','-h','/tmp/iso','-p','55432','-U','postgres','-d','a01ui','-qAt','-c',q],capture_output=True,text=True).stdout.strip()
A='aaaaaaaa-aaaa-aaaa-aaaa-00000000000a'; MGR='22222222-2222-2222-2222-222222222222'
R=[]
def check(n,ok,d=''): R.append(('PASS' if ok else 'FAIL')+' | '+n+('' if ok else ' :: '+d)); print(R[-1])
def setperm(key,val): db(f"INSERT INTO role_permissions(tenant_id,role,permission_key,granted) VALUES ('{A}','manager','{key}',{val}) ON CONFLICT (tenant_id,role,permission_key) DO UPDATE SET granted=excluded.granted")
async def open_as(p, uid, email, path):
    ctx=await p.chromium.launch(headless=True); c=await ctx.new_context(viewport={'width':1280,'height':1800}); pg=await c.new_page()
    tok=jwt(uid,email); sess={'access_token':tok,'refresh_token':'none','token_type':'bearer','expires_in':99999999,'expires_at':2000000000,'user':{'id':uid,'email':email,'aud':'authenticated','role':'authenticated','app_metadata':{},'user_metadata':{}}}
    await pg.goto('http://localhost:8090/auth'); 
    await pg.evaluate(f"for (const k of ['sb-localhost-auth-token']) localStorage.setItem(k, {json.dumps(json.dumps(sess))})")
    await pg.goto('http://localhost:8090'+path); await pg.wait_for_timeout(5000)
    return ctx,pg,tok
async def main():
  async with async_playwright() as p:
    # S1 approve switched off
    setperm('approve_timesheets','false'); setperm('view_timesheets','true')
    b,pg,tok=await open_as(p,MGR,'manager@example.test','/timesheets'); await pg.screenshot(path=SHOT+'s1_approve_off.png')
    body=await pg.inner_text('body')
    check('manager can open Timesheets', 'Testa' in body or 'Testb' in body, body[:300])
    check('approve switched off: no tick/cross buttons', await pg.locator('button:has(svg.lucide-check)').count()==0)
    await pg.get_by_role('button',name='Select All Pending').click(); await pg.wait_for_timeout(500)
    check('approve switched off: no bulk Approve bar after selecting all', await pg.get_by_role('button',name='Approve',exact=False).count()==0)
    # direct call from the same signed-in browser
    r=await pg.evaluate("""async (t)=>{const x=await fetch('http://localhost:54321/rest/v1/time_entries?id=eq.7e000000-0000-0000-0000-000000000002',{method:'PATCH',headers:{apikey:'x',Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({status:'approved'})});return [x.status, (await x.json()).length]}""", tok)
    check('FINDING: direct approval from manager browser still accepted by database', r==[200,1], str(r))
    db("UPDATE time_entries SET status='pending' WHERE id='7e000000-0000-0000-0000-000000000002'")
    await b.close()
    # S2 control: switched on
    setperm('approve_timesheets','true')
    b,pg,_=await open_as(p,MGR,'manager@example.test','/timesheets'); await pg.screenshot(path=SHOT+'s2_approve_on.png')
    check('approve switched on: tick buttons shown', await pg.locator('button:has(svg.lucide-check)').count()==2)
    await pg.get_by_role('button',name='Select All Pending').click(); await pg.wait_for_timeout(500)
    check('approve switched on: bulk Approve bar appears', await pg.get_by_role('button',name='Approve',exact=False).count()>0)
    await b.close()
    # S3 view switched off
    setperm('view_timesheets','false')
    b,pg,_=await open_as(p,MGR,'manager@example.test','/timesheets'); await pg.screenshot(path=SHOT+'s3_view_off.png')
    body=await pg.inner_text('body'); check('view switched off: page refused', 'Testa' not in body and 'Testb' not in body, body[:200])
    await b.close(); setperm('view_timesheets','true')
    # S4 permission settings unreadable
    db("REVOKE SELECT ON role_permissions FROM authenticated; NOTIFY pgrst, 'reload schema'"); time.sleep(1)
    b,pg,_=await open_as(p,MGR,'manager@example.test','/timesheets'); await pg.wait_for_timeout(4000); await pg.screenshot(path=SHOT+'s4_perm_fail.png')
    body=await pg.inner_text('body'); check('permission read failure: "could not be checked", no data', 'could not be checked' in body and 'Testa' not in body, body[:200])
    await b.close(); db("GRANT SELECT ON role_permissions TO authenticated")
    # S5 role lookup unreadable
    db("REVOKE SELECT ON user_roles FROM authenticated"); time.sleep(1)
    b,pg,_=await open_as(p,MGR,'manager@example.test','/schedule'); await pg.wait_for_timeout(3000); await pg.screenshot(path=SHOT+'s5_role_fail.png')
    body=await pg.inner_text('body'); check('role lookup failure: schedule not opened as basic staff', 'could not be checked' in body or 'Access' in body, body[:200])
    await b.close(); db("GRANT SELECT ON user_roles TO authenticated")
    print('A01_UI', sum(x.startswith('PASS') for x in R), 'pass', sum(x.startswith('FAIL') for x in R), 'fail')
asyncio.run(main())
