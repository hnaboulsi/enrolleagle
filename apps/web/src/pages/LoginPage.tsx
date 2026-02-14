import { getGoogleStartUrl } from '../api/client'

export default function LoginPage() {
  return (
    <div className="center-screen">
      <div className="panel narrow">
        <h1>EnrollEagle</h1>
        <p>Community college seat tracking with email alerts.</p>
        <a className="button-link" href={getGoogleStartUrl()}>
          Sign in with Google
        </a>
      </div>
    </div>
  )
}
