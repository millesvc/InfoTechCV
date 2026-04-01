const firebaseConfig = {
  apiKey: "AIzaSyDIRvZ8U2bk566EmJCYI96eW3VgYrhMPY8",
  authDomain: "infotechvc-c0bdf.firebaseapp.com",
  projectId: "infotechvc-c0bdf",
  storageBucket: "infotechvc-c0bdf.firebasestorage.app",
  messagingSenderId: "1096715529282",
  appId: "1:1096715529282:web:ac6bd4d1213ee1d0a551db",
  measurementId: "G-ZXZW57CKNS"
};


firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();