import { initializeApp } from "firebase/app"
import { getAnalytics } from "firebase/analytics"

const firebaseConfig = {
    apiKey: "AIzaSyBeqTfRlYGlcLsyL4RpRgTsx7yS7w450R4",
    authDomain: "copytheavatarsettings.firebaseapp.com",
    projectId: "copytheavatarsettings",
    storageBucket: "copytheavatarsettings.appspot.com",
    messagingSenderId: "442558045279",
    appId: "1:442558045279:web:a44fc61ce95bb511f18fea",
    measurementId: "G-Y2SF4RRHYB"
  };

const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)

export default analytics