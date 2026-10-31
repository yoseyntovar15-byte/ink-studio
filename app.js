const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
let appointments = read("ink_appointments");
let clients = read("ink_clients");
let activeFilter = "Todas";

function money(value){return new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:2}).format(Number(value)||0)}
function dateLabel(date){if(!date)return "";return new Date(date+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"short",year:"numeric"})}
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function go(page){$$(".page").forEach(p=>p.classList.toggle("active",p.id===page));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.go===page));window.scrollTo(0,0);render()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)});
function appointmentCard(a){return `<article class="appointment"><div class="card-top"><div><div class="card-title">${escapeHTML(a.client)}</div><div class="card-sub">${dateLabel(a.date)} · ${escapeHTML(a.time)}<br>${escapeHTML(a.design)}</div></div><span class="status ${a.status}">${a.status}</span></div><div class="card-sub">Total: ${money(a.price)} · Anticipo: ${money(a.deposit)} · Saldo: ${money(Math.max(0,a.price-a.deposit))}</div><div class="card-actions"><button class="small-btn" data-status="${a.id}">Cambiar estado</button><button class="small-btn danger" data-delete="${a.id}">Eliminar</button></div></article>`}
function render(){
  const today=new Date().toISOString().slice(0,10);
  $("#stat-hoy").textContent=appointments.filter(a=>a.date===today).length;
  $("#stat-clientes").textContent=clients.length;
  $("#stat-pendiente").textContent=money(appointments.filter(a=>a.status!=="Completada").reduce((s,a)=>s+Math.max(0,(+a.price||0)-(+a.deposit||0)),0));
  $("#stat-anticipos").textContent=money(appointments.reduce((s,a)=>s+(+a.deposit||0),0));
  const upcoming=[...appointments].filter(a=>a.status!=="Completada").sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,4);
  $("#home-appointments").innerHTML=upcoming.length?upcoming.map(appointmentCard).join(""):'<div class="empty">Todavía no tienes citas. ¡Agrega la primera!</div>';
  const filtered=appointments.filter(a=>activeFilter==="Todas"||a.status===activeFilter).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("#appointments-list").innerHTML=filtered.length?filtered.map(appointmentCard).join(""):'<div class="empty">No hay citas en esta categoría.</div>';
  const term=($("#client-search")?.value||"").toLowerCase();
  const filteredClients=clients.filter(c=>(c.name+" "+c.phone).toLowerCase().includes(term));
  $("#clients-list").innerHTML=filteredClients.length?filteredClients.map(c=>`<article class="client-card"><div class="card-title">${escapeHTML(c.name)}</div><div class="card-sub">${escapeHTML(c.phone||"Sin teléfono")} ${c.email?"· "+escapeHTML(c.email):""}</div>${c.notes?`<div class="card-sub">${escapeHTML(c.notes)}</div>`:""}</article>`).join(""):'<div class="empty">Aún no hay clientes guardados.</div>';
  const due=appointments.filter(a=>a.status!=="Completada").reduce((s,a)=>s+Math.max(0,(+a.price||0)-(+a.deposit||0)),0);
  $("#payments-due").textContent=money(due);
  $("#payments-list").innerHTML=appointments.length?[...appointments].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(a=>`<div class="payment-row"><div><div class="card-title">${escapeHTML(a.client)}</div><div class="card-sub">${dateLabel(a.date)} · ${a.status}</div></div><div style="text-align:right"><strong>${money(Math.max(0,a.price-a.deposit))}</strong><div class="card-sub">saldo</div></div></div>`).join(""):'<div class="empty">Los pagos de tus citas aparecerán aquí.</div>';
}
$("#appointment-form").addEventListener("submit",e=>{
  e.preventDefault();const f=new FormData(e.target);const a=Object.fromEntries(f.entries());
  a.id=crypto.randomUUID();a.price=Number(a.price)||0;a.deposit=Number(a.deposit)||0;
  appointments.push(a);save("ink_appointments",appointments);
  const existing=clients.find(c=>c.name.toLowerCase()===a.client.toLowerCase());
  if(!existing){clients.push({id:crypto.randomUUID(),name:a.client,phone:a.phone,email:"",notes:""});save("ink_clients",clients)}
  e.target.reset();go("citas");toast("Cita guardada correctamente");
});
$("#client-form").addEventListener("submit",e=>{
  e.preventDefault();const c=Object.fromEntries(new FormData(e.target).entries());c.id=crypto.randomUUID();
  clients.push(c);save("ink_clients",clients);e.target.reset();go("clientes");toast("Cliente guardado correctamente");
});
document.addEventListener("click",e=>{
  const filter=e.target.closest("[data-filter]");if(filter){activeFilter=filter.dataset.filter;$$("[data-filter]").forEach(b=>b.classList.toggle("active",b===filter));render()}
  const del=e.target.closest("[data-delete]");if(del&&confirm("¿Eliminar esta cita?")){appointments=appointments.filter(a=>a.id!==del.dataset.delete);save("ink_appointments",appointments);render();toast("Cita eliminada")}
  const status=e.target.closest("[data-status]");if(status){const a=appointments.find(x=>x.id===status.dataset.status);const states=["Pendiente","Confirmada","Completada"];a.status=states[(states.indexOf(a.status)+1)%states.length];save("ink_appointments",appointments);render();toast("Estado actualizado")}
});
$("#client-search").addEventListener("input",render);
const dateInput=$('#appointment-form [name="date"]');dateInput.value=new Date().toISOString().slice(0,10);
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
render();