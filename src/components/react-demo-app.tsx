// @ts-nocheck
// This file is injected into an iframe via Babel Standalone (type="text/babel").
// Keep it self-contained: no imports. React and ReactDOM are provided globally by the parent HTML.

function Counter({ value, onChange }) {
  React.useEffect(() => {
    document.title = `Count: ${value}`;
  }, [value]);
  return (
    <div className="card">
      <h3>Counter</h3>
      <div className="row">
        <button onClick={() => onChange(value - 1)}>-</button>
        <div style={{ minWidth: 40, textAlign: 'center' }}>{String(value)}</div>
        <button onClick={() => onChange(value + 1)}>+</button>
      </div>
      <div className="muted space">document.title updates inside the iframe</div>
    </div>
  );
}

function TodoList({ items, setItems }) {
  const [text, setText] = React.useState('');
  const remaining = React.useMemo(() => items.filter((i) => !i.done).length, [items]);
  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems([{ id: Date.now(), title: t, done: false }, ...items]);
    setText('');
  };
  const toggle = (id) => setItems(items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id) => setItems(items.filter((x) => x.id !== id));

  return (
    <div className="card">
      <h3>Todos ({remaining} left)</h3>
      <div className="row">
  <input placeholder="Add todo..." value={text} onChange={(e) => setText(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <div className="space" />
      <div className="grid">
        {items.map((item) => (
          <label key={item.id} className="todo card">
            <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)} />
            <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>{item.title}</span>
            <button onClick={() => remove(item.id)}>Delete</button>
          </label>
        ))}
      </div>
    </div>
  );
}

function Contact({ form, setForm }) {
  const [submitted, setSubmitted] = React.useState(false);
  const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name && /@/.test(form.email) && form.message.length > 4;

  return (
    <div className="card">
      <h3>Contact form (demo)</h3>
      {submitted ? (
        <div>Submitted! Thanks, {form.name}</div>
      ) : (
        <>
          <div className="space" />
          <input placeholder="Name" value={form.name} onChange={onChange('name')} />
          <div className="space" />
          <input placeholder="Email" value={form.email} onChange={onChange('email')} />
          <div className="space" />
          <textarea rows={3} placeholder="Message" value={form.message} onChange={onChange('message')} />
          <div className="space" />
          <button onClick={() => setSubmitted(true)} disabled={!valid} aria-disabled={!valid}>
            Send
          </button>
        </>
      )}
      <div className="muted space">No network calls; pure client-side demo</div>
    </div>
  );
}

function Notes({ value, onChange }) {
  return (
    <div className="card">
      <h3>Notes</h3>
      <div className="space" />
    <textarea rows={8} placeholder="Write some notes..." value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="muted space">Your notes persist while switching tabs.</div>
    </div>
  );
}

function Tabs({ tab, setTab }) {
  const tabs = ['home', 'todos', 'contact', 'notes'];
  return (
    <div className="row" role="tablist">
      {tabs.map((t) => (
        <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
          {t[0].toUpperCase() + t.slice(1)}
        </button>
      ))}
    </div>
  );
}

function App() {
  // Hoist state so it persists across tab switches.
  const [tab, setTab] = React.useState('home');
  const [count, setCount] = React.useState(0);
  const [todos, setTodos] = React.useState([
    { id: 1, title: 'Try the counter', done: false },
    { id: 2, title: 'Add a todo', done: false },
  ]);
  const [form, setForm] = React.useState({ name: '', email: '', message: '' });
  const [notes, setNotes] = React.useState('');

  return (
    <>
      <Tabs tab={tab} setTab={setTab} />
      <div className="space" />
      {/* Keep all sections mounted; hide the inactive ones for state persistence */}
      <div style={{ display: tab === 'home' ? 'block' : 'none' }}>
        <div className="grid">
          <Counter value={count} onChange={setCount} />
          <div className="card">
            <h3>About this island</h3>
            <p>This React app is fully isolated in a sandboxed iframe.</p>
            <ul>
              <li>Uses React 18 UMD builds</li>
              <li>State, effects, conditional rendering</li>
              <li>No cross-origin access required</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={{ display: tab === 'todos' ? 'block' : 'none' }}>
        <TodoList items={todos} setItems={setTodos} />
      </div>

      <div style={{ display: tab === 'contact' ? 'block' : 'none' }}>
        <Contact form={form} setForm={setForm} />
      </div>

      <div style={{ display: tab === 'notes' ? 'block' : 'none' }}>
        <Notes value={notes} onChange={setNotes} />
      </div>
    </>
  );
}

const rootEl = document.getElementById('root');
// Support both React 18 createRoot and older environments if needed
const root = (window as any).ReactDOM.createRoot(rootEl);
root.render(<App />);
