import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav className="top-nav">
      <span className="nav-brand">Wildlink</span>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Merchants
        </NavLink>
        <NavLink to="/categories" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Categories
        </NavLink>
        <NavLink to="/tags" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Tags
        </NavLink>
      </div>
    </nav>
  )
}
