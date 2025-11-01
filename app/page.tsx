"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Download, Filter, Map as MapIcon, ShieldCheck, Globe2, Info, CheckCircle2 } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const PALETTE = { deepBlue:'#0F4C81', teal:'#16A085', olive:'#6B8E23', slate:'#475569', coral:'#FF6B6B', ink:'#111827', bg:'#F8FAFC' }
const CATEGORIES = [
  { key:'dialogue', label:'Dialogue', color:PALETTE.teal },
  { key:'mediation', label:'Mediation', color:PALETTE.deepBlue },
  { key:'agreement', label:'Agreement', color:PALETTE.olive },
  { key:'implementation', label:'Implementation', color:PALETTE.coral },
  { key:'arrangement', label:'Access/Arrangement', color:PALETTE.slate },
]
const SAMPLE_DATA = {
  Ireland:[
    { date:'2025-09-01', admin1:'Dublin', admin2:'Dublin City', category:'dialogue', subtype:'forum', title:'Community dialogue on integration', source_name:'Council press note', source_url:'https://example.ie/1', confidence:'high', lat:53.34, lon:-6.26, precision:'city', sensitive:false },
    { date:'2025-09-03', admin1:'Cork', admin2:'Cork City', category:'mediation', subtype:'session', title:'Mediation session announced', source_name:'NGO post', source_url:'https://example.ie/2', confidence:'medium', lat:51.90, lon:-8.47, precision:'city', sensitive:false },
    { date:'2025-09-04', admin1:'Galway', admin2:'Galway City', category:'arrangement', subtype:'access', title:'Access coordination meeting', source_name:'Media', source_url:'https://example.ie/3', confidence:'high', lat:53.27, lon:-9.05, precision:'city', sensitive:false },
    { date:'2025-09-05', admin1:'Dublin', admin2:'Dublin City', category:'agreement', subtype:'MOU', title:'MOU signed for community hotline', source_name:'Official', source_url:'https://example.ie/4', confidence:'medium', lat:53.34, lon:-6.26, precision:'city', sensitive:false },
    { date:'2025-09-07', admin1:'Limerick', admin2:'Limerick City', category:'implementation', subtype:'milestone', title:'Milestone verified (training delivered)', source_name:'Council update', source_url:'https://example.ie/5', confidence:'high', lat:52.66, lon:-8.63, precision:'city', sensitive:false },
  ],
  Ethiopia:[
    { date:'2025-09-01', admin1:'Addis Ababa', admin2:'Bole', category:'dialogue', subtype:'forum', title:'Regional dialogue forum (observer CSO)', source_name:'Official notice', source_url:'https://example.et/1', confidence:'medium', lat:8.98, lon:38.80, precision:'district', sensitive:false },
    { date:'2025-09-02', admin1:'Amhara', admin2:'[selected]', category:'arrangement', subtype:'access', title:'Access coordination meeting', source_name:'Media', source_url:'https://example.et/2', confidence:'high', lat:11.59, lon:37.39, precision:'district', sensitive:true },
    { date:'2025-09-03', admin1:'Oromia', admin2:'[selected]', category:'implementation', subtype:'milestone', title:'Implementation milestone verified', source_name:'Official', source_url:'https://example.et/3', confidence:'high', lat:8.98, lon:38.80, precision:'region', sensitive:false },
    { date:'2025-09-04', admin1:'Tigray', admin2:'Mekelle', category:'mediation', subtype:'session', title:'Mediation session announced', source_name:'Media', source_url:'https://example.et/4', confidence:'low', lat:13.50, lon:39.47, precision:'city', sensitive:true },
    { date:'2025-09-05', admin1:'SNNPR', admin2:'[selected]', category:'agreement', subtype:'statement', title:'Joint statement on coordination', source_name:'CSO post', source_url:'https://example.et/5', confidence:'medium', lat:6.74, lon:37.77, precision:'district', sensitive:false },
  ]
}

function toWeek(dateStr: string) {
  const d = new Date(dateStr);
  const first = new Date(d.getFullYear(), 0, 1);
  const diff = Math.round(((d.getTime() - first.getTime()) / 86400000 + first.getDay()) / 7);
  return `${d.getFullYear()}-W${String(diff).padStart(2, '0')}`;
}
function useFiltered(data:any[],filters:any){return React.useMemo(()=>data.filter(ev=>{if(filters.category&&ev.category!==filters.category)return false;if(filters.admin1&&ev.admin1!==filters.admin1)return false;return true;}),[data,filters])}
function aggregateByWeek(data:any[]){const map=new Map();data.forEach(ev=>{const w=toWeek(ev.date);map.set(w,(map.get(w)||0)+1)});const arr=[...map.entries()].map(([week,count])=>({week,count}));return arr.sort((a,b)=>(a.week>b.week?1:-1))}
function countByCategory(data:any[]){const counts=CATEGORIES.map(c=>({key:c.key,label:c.label,color:c.color,count:0}));data.forEach(ev=>{const i=counts.findIndex(c=>c.key===ev.category);if(i>=0)counts[i].count+=1});return counts}
function topAdmin1(data:any[]){const map=new Map();data.forEach(ev=>map.set(ev.admin1,(map.get(ev.admin1)||0)+1));return [...map.entries()].map(([admin1,count])=>({admin1,count})).sort((a,b)=>b.count-a.count).slice(0,5)}

function downloadCSV(rows:any[]){
  const headers=['date','country','admin1','admin2','title','category','subtype','source_name','source_url','confidence','lat','lon','location_precision','sensitivity_flag'];
  const lines=[headers.join(',')].concat(rows.map(r=>[r.date,'<country>',r.admin1,r.admin2,'"'+(r.title||'').replaceAll('"','""')+'"',r.category,r.subtype||'',r.source_name||'',r.source_url||'',r.confidence||'',r.lat||'',r.lon||'',r.precision||'',r.sensitive?'y':'n'].join(',')));
  const blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`peace_barometer_demo_${Date.now()}.csv`;a.click();URL.revokeObjectURL(url);
}

export default function Page(){
  const [country,setCountry]=useState('Ethiopia');
  const [filters,setFilters]=useState({category:'',admin1:''});
  const [liveData,setLiveData]=useState<any[]|null>(null);
  const data = liveData || SAMPLE_DATA[country as keyof typeof SAMPLE_DATA];


  useEffect(()=>{const sheetUrl=typeof window!=='undefined'?(window as any).NEXT_PUBLIC_SHEET_URL||'':'';if(sheetUrl){fetch(sheetUrl).then(r=>r.text()).then(t=>setLiveData([])).catch(()=>setLiveData(null));}},[]);

  const filtered=useFiltered(data,filters);
  const weeks=useMemo(()=>aggregateByWeek(filtered),[filtered]);
  const catCounts=useMemo(()=>countByCategory(filtered),[filtered]);
  const topAreas=useMemo(()=>topAdmin1(filtered),[filtered]);
  const allAdmin1=useMemo(()=>[...new Set(data.map(d=>d.admin1))],[data]);

  return (<div className='min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-800'>
    <header className='sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200'>
      <div className='max-w-6xl mx-auto px-4 py-4 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='h-9 w-9 rounded-full border-2 border-slate-800 grid place-items-center'><Globe2 size={18}/></div>
          <div><h1 className='text-xl font-bold'>Peace Barometer</h1></div>
        </div>
        <div className='flex items-center gap-3'>
          <select className='border rounded-lg px-3 py-2 text-sm' value={country} onChange={e=>{setCountry(e.target.value);setFilters({category:'',admin1:''})}}>
            <option>Ireland</option><option>Ethiopia</option>
          </select>
          <Button onClick={()=>downloadCSV(filtered)} className='inline-flex items-center gap-2 border'><Download size={16}/> Download CSV</Button>
        </div>
      </div>
    </header>

    <main className='max-w-6xl mx-auto px-4 py-6'>
      <div className='grid md:grid-cols-3 gap-3 mb-6'>
        <div className='col-span-2 flex flex-wrap gap-2 items-center'>
          <span className='text-xs uppercase tracking-wide text-slate-500 flex items-center gap-2'><Filter size={14}/> Filters</span>
          <select className='border rounded-lg px-3 py-2 text-sm' value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}>
            <option value=''>All categories</option>{CATEGORIES.map(c=>(<option key={c.key} value={c.key}>{c.label}</option>))}
          </select>
          <select className='border rounded-lg px-3 py-2 text-sm' value={filters.admin1} onChange={e=>setFilters(f=>({...f,admin1:e.target.value}))}>
            <option value=''>All regions/counties</option>{allAdmin1.map(a=><option key={a}>{a}</option>)}
          </select>
          {(filters.category||filters.admin1)&&(<button className='text-xs underline ml-2' onClick={()=>setFilters({category:'',admin1:''})}>Clear</button>)}
        </div>
        <div className='text-right text-xs text-slate-500'><span className='inline-flex items-center gap-2'><ShieldCheck size={14}/> No PII • admin‑2 precision for sensitive items</span></div>
      </div>

      <section className='grid md:grid-cols-4 gap-4 mb-6'>
        <KPI title='Events (filtered)' value={filtered.length} note='This view only' />
        <KPI title='Top area' value={topAreas[0]?.admin1 || '—'} note={`${topAreas[0]?.count || 0} items`} />
        <KPI title='Most common category' value={(catCounts.sort((a,b)=>b.count-a.count)[0]?.label) || '—'} note='By count'/>
        <KPI title='Confidence mix' value={`${Math.round((filtered.filter(x=>x.confidence==='high').length/Math.max(1,filtered.length))*100)}% high`} note='Heuristic'/>
      </section>

      <section className='grid lg:grid-cols-3 gap-6 mb-6'>
        <div className='bg-white rounded-2xl shadow p-4 lg:col-span-2'>
          <h3 className='font-semibold mb-3'>Weekly trend</h3>
          <div className='h-56'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={weeks} margin={{left:8,right:8,top:8,bottom:8}}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='week' hide/><YAxis allowDecimals={false} /><Tooltip/>
                <Line type='monotone' dataKey='count' stroke={PALETTE.deepBlue} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className='bg-white rounded-2xl shadow p-4'>
          <h3 className='font-semibold mb-3 flex items-center gap-2'><MapIcon size={16}/> Map (preview)</h3>
          <div className='h-56 border rounded-xl grid place-items-center text-slate-500 text-sm'>
              </div>
        </div>
      </section>

      <section className='bg-white rounded-2xl shadow p-4 mb-6'>
        <h3 className='font-semibold mb-3'>By category</h3>
        <div className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={catCounts}><CartesianGrid strokeDasharray='3 3' /><XAxis dataKey='label' /><YAxis allowDecimals={false} /><Tooltip/><Bar dataKey='count' fill={PALETTE.teal} /></BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className='bg-white rounded-2xl shadow overflow-hidden'>
        <div className='px-4 py-3 border-b bg-slate-50 flex items-center justify-between'><h3 className='font-semibold'>Events</h3><span className='text-xs text-slate-500'>{filtered.length} shown</span></div>
        <div className='overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-slate-50'>
              <tr><Th>Date</Th><Th>Admin‑1</Th><Th>Category</Th><Th>Title</Th><Th>Source</Th><Th className='text-right'>Conf.</Th></tr>
            </thead>
            <tbody>
              {filtered.map((ev,idx)=>(
                <tr key={idx} className='border-t hover:bg-slate-50/60'>
                  <Td>{ev.date}</Td><Td>{ev.admin1}</Td>
                  <Td><span className='px-2 py-1 rounded-full text-xs' style={{backgroundColor:'#F1F5F9',color:PALETTE.ink}}>{CATEGORIES.find(c=>c.key===ev.category)?.label || ev.category}</span></Td>
                  <Td className='max-w-[360px]'><div className='line-clamp-2'>{ev.title}</div><div className='text-xs text-slate-500'>{ev.admin2} • {ev.precision}</div></Td>
                  <Td>{ev.source_url ? (<a href={ev.source_url} target='_blank' className='underline' rel='noreferrer'>{ev.source_name || 'Source'}</a>) : (<span>{ev.source_name || '—'}</span>)}</Td>
                  <Td className='text-right'>{ev.confidence}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className='mt-8 text-xs text-slate-500 grid gap-1'>
        </footer>
    </main>
  </div>)
}

function KPI({ title, value, note }:{title:string,value:string|number,note?:string}){return(<Card><CardContent><div className='text-xs uppercase tracking-wide text-slate-500'>{title}</div><div className='text-2xl font-semibold my-1'>{value}</div><div className='text-xs text-slate-500'>{note}</div></CardContent></Card>)}
function Th({children,className=''}:{children:React.ReactNode,className?:string}){return <th className={`text-left font-medium text-slate-600 px-4 py-2 ${className}`}>{children}</th>}
function Td({children,className=''}:{children:React.ReactNode,className?:string}){return <td className={`px-4 py-2 align-top ${className}`}>{children}</td>}
