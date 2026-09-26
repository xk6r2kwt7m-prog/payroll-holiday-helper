import subprocess,sys,json
DB=None; R={'pass':0,'fail':0}; LOG=[]
def sql(q, user=None, role='authenticated', db=None):
    pre=''
    if user=='service': pre="SET ROLE service_role; SELECT set_config('request.jwt.claims','{\"role\":\"service_role\"}',false);"
    elif user=='anon': pre="SELECT set_config('request.jwt.claims','{\"role\":\"anon\"}',false); SET ROLE anon;"
    elif user: pre=f"SELECT set_config('request.jwt.claims','{json.dumps({'sub':user,'role':role})}',false); SET ROLE {role};"
    p=subprocess.run(['psql','-h','/tmp/iso','-p','55432','-U','postgres','-d',db or DB,'-v','ON_ERROR_STOP=1','-qAt','-c',pre+q] if False else ['psql','-h','/tmp/iso','-p','55432','-U','postgres','-d',db or DB,'-v','ON_ERROR_STOP=1','-qAt'],input=pre+'\n'+q,capture_output=True,text=True)
    return p.returncode, (p.stdout.strip().split('\n')[-1] if p.stdout.strip() else ''), p.stderr.strip()
def check(name, ok, detail=''):
    R['pass' if ok else 'fail']+=1; LOG.append(('PASS' if ok else 'FAIL')+' '+name+('' if ok else ' :: '+detail[:300])); print(LOG[-1])
def refused(name,q,user,must=None,**k):
    rc,o,e=sql(q,user,**k); check(name, rc!=0 and (must is None or must in e), f'rc={rc} out={o} err={e}')
def ok(name,q,user=None,expect=None,**k):
    rc,o,e=sql(q,user,**k); check(name, rc==0 and (expect is None or o==expect), f'rc={rc} out={o!r} want={expect!r} err={e}')
def val(q,user=None): return sql(q,user)[1]
