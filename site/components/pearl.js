/*!
 * <sheps-pearl> — the Sheps.Studio pearl head as a drop-in web component.
 *
 * Usage:
 *   <script type="module" src="/pearl/pearl.js"></script>
 *   <sheps-pearl style="width: 360px; height: 360px"></sheps-pearl>
 *
 * The head follows the mouse. A "Mirror my face" button asks for the camera and switches to
 * face mirroring (head turn, blinks, smile, mouth). Video never leaves the visitor's browser.
 *
 * Attributes (all optional):
 *   camera="off"            hide the camera button
 *   label="Mirror my face"  text on the camera button
 *   shadow="off"            no lilac/blue drop shadow
 *   follow="page|element"   follow the cursor anywhere on the page (default) or only while over the element
 *   features="smooth|dots"  solid black eyes and smile (default) or the dot-matrix face
 *   layout="corner"         pearl centred in the element, camera button pinned to the bottom-left corner
 *
 * Methods: el.startCamera(), el.stopCamera()
 * Events:  'pearl-camera' with detail { state: 'starting' | 'on' | 'off' | 'blocked' | 'error', message? }
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js/+esm';

const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';   // same build the Avatar filter uses
const MEDIAPIPE_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/* ---------- the pearl's look: a sphere painted with the gradient from the Blender model (64x32, linear RGB) ---------- */
const GRAD = 'sYb7sYb7sYf7sYj7sYj7sYn7sYn7sYr7sYr7sYr7sYv7sYv7sYv7sYv7sYz7sYz7sYz7sYz7sYv7sYv7sYv7sYv7sYr7sYr7sYr7sYn7sYn7sYj7sYj7sYf7sYb7sYb7sYX7sYT7sYT7sYP7sYP7sYL7sYL7sYH7sYH7sYH7sID7sID7sID7sID7sH/7sH/7sH/7sH/7sID7sID7sID7sID7sYH7sYH7sYH7sYL7sYL7sYP7sYP7sYT7sYT7sYX7sYb7sYf7sYn7sYr7sYv7sYz7sY37sI77sI77sI/6sJD6sJD6sJD6sJH6sJH6sJH6sJH6sJH6sJH6sJD6sJD6sJD6sI/6sI77sI77sY37sYz7sYv7sYr7sYn7sYf7sYb7sYX7sYT7sYL7sYH7sID7sH/7sH77r337r337rnz7rnv7rnv6rnr6rXr6rXr6rXr6rXr6rXr6rXr6rnr6rnv6rnv7rnz7r337r337sH77sH/7sID7sYH7sYL7sYT7sYX7sof7sYr7sYz7sY/7sJD6sJL6r5T6r5X5rpb5rZj5rZn4rJn4rJr4q5v4q5v4q5v4q5v4q5v4q5v4rJr4rJn4rZn4rZj5rpb5r5X5r5T6sJL6sJD6sY/7sYz7sYr7sof7soX7sYL7sYD7sH77r3z6rXr6rHj6q3f6q3X6qnT6qXP6qHL6qHL6p3H6p3H6p3H6p3H6p3H6p3H6qHL6qHL6qXP6qnT6q3X6q3f6rHj6rXr6r3z6sH77sYD7sYL7soX7son7sY37sZD6sJP6r5b5rpj5rJv4q533qZ/3qKH2pqL1paP1pKT1o6X0o6b0oqb0oqb0o6b0o6X0pKT1paP1pqL1qKH2qZ/3q533rJv4rpj5r5b5sJP6sZD6sY37son7soX7sYL7sH76rnv6rHj6q3X6qXP6qHH5pm/5pW75pGz5o2v5omv5omr5oWr5oWr5oWr5oWr5omr5omv5o2v5pGz5pW75pm/5qHH5qXP6q3X6rHj6rnv6sH76sYL7soX7sov7spD6sJT6r5j5rZv4q5/3qKL2paX1o6f0oKnznavym6zxmqzxmKzwl6zwl6zwl6zwl6zwmKzwmqzxm6zxnavyoKnzo6f0paX1qKL2q5/3rZv4r5j5sJT6spD6sov7s4b7soH6r336rXj6q3X5qHH5pm/5pGz5omr5oGn5n2f5nmf5nmf5nmb5nmb5nmb5nmb5nmb5nmb5nmf5nmf5n2f5oGn5omr5pGz5pm/5qHH5q3X5rXj6r336soH6s4b7s476spT6sJn5rZ74qqL2pqb1oqrznq3yma/wla/vkq/uj6/tja/ti6/siq/sia/sia/siq/si6/sja/tj6/tkq/ula/vma/wnq3yoqrzpqb1qqL2rZ74sJn5spT6s476tIj6soH6r3z5rHf5qXL5pm75o2v5oWj5nmb5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nWX5nmb5oWj5o2v5pm75qXL5rHf5r3z5soH6tIj6tJL6spn5r574q6T2pqn0oK3ymrHwlLLuj7LtirLrhrLqgrHpf7HofbHofLHne7Hne7HnfLHnfbHof7HogrHphrLqirLrj7LtlLLumrHwoK3ypqn0q6T2r574spn5tJL6tYr6s4L6r3v5rHX4qHD4pWz4oWj4nmX4nGP4m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5m2P5nGP4nmX4oWj4pWz4qHD4rHX4r3v5s4L6tYr6tZb6sp75rqT3qKr0obDymbXvkrbtirbrhLXpfrXneLXmdLXkcrTkcbTjcLTjcLTjcLTjcLTjcbTjcrTkdLXkeLXmfrXnhLXpirbrkrbtmbXvobDyqKr0rqT3sp75tZb6t436tIT5sHz4rHX4qG/3pGr3oGb3nWP4mmH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mWH4mmH4nWP4oGb3pGr3qG/3rHX4sHz4tIT5t436t5v5sqT4rKr1pLHym7fvkbrsiLrpf7rnd7nlcLnjbLnha7jha7jha7jha7jha7jha7jha7jha7jha7jha7jhbLnhcLnjd7nlf7rniLrpkbrsm7fvpLHyrKr1sqT4t5v5uZD6t4b5sn33rnX3qW72pWn2oWX2nWL3mV/3mF/3mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/4mF/3mV/3nWL3oWX2pWn2qW72rnX3sn33t4b5uZD6uaH5sqr3qrH0oLjwlb3sib/pfr7mdL7ja73gZr3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZb3fZr3fa73gdL7jfr7mib/plb3soLjwqrH0sqr3uaH5vJX5uon4tX/3sHb2q271p2j1omT1nmD1ml72l133llz3lVz3lVz3lVz3lVz3lVz3lVz3lVz3lVz3lVz3lVz3llz3l133ml72nmD1omT1p2j1q271sHb2tX/3uon4vJX5u6j5srH2qLjynL/ujsTqgMTmdMPiaMLfYMLcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcX8LcYMLcaMLfdMPigMTmjsTqnL/uqLjysrH2u6j5wJv5vo33uYL2tHj0r2/0q2nzpmPzomDznl30m1v0mFr1lVr2lFn2lFn2k1n2k1n2k1n2k1n2lFn2lFn2lVr2mFr1m1v0nl30omDzpmPzq2nzr2/0tHj0uYL2vo33wJv5vrD4srn1pr/wl8bsh8nneMniacjeXcfbWcfaWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWMfZWcfaXcfbacjeeMnih8nnl8bspr/wsrn1vrD4xaL5w5P3vob1unvztXLysWrxrGTxqF/xpFzxoVvynlrym1nzmVj0l1j0llj0llj0llj0llj0l1j0mVj0m1nznlryoVvypFzxqF/xrGTxsWrxtXLyunvzvob1w5P3xaL5wbn4s8H0o8fvks3pgM/kb87fXs3aU8zXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXUszXU8zXXs3ab87fgM/kks3po8fvs8H0wbn4yqr4yZr2xYzzwX/xvXXvuWzutWTtsV/trlztq1vuqFrvpVnvo1nwoljwoVjwoFjwoFjwoVjwoljwo1nwpVnvqFrvq1vurlztsV/ttWTtuWzuvXXvwX/xxYzzyZr2yqr4xMP3s8rzoc/tjdTnedThZtPbVNLWS9LUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUStLUS9LUVNLWZtPbedThjdTnoc/ts8rzxMP30bP40aL1zZPyyoXvx3ntxG/rwGbpvV/oulzpt1zptVvqs1rrsVrrsFnrr1nsrlnsrlnsr1nssFnrsVrrs1rrtVvqt1zpulzpvV/owGbpxG/rx3ntyoXvzZPy0aL10bP4yM33tNTyn9fridrkc9reXtnYS9jTQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRQ9jRRNjRRNjRTNjTX9nZddrfitrloNfrtdTyyc732L742q31153x1Y3t04Dq0HPnzmnlzGDkyl7kx13kxV3lxFzlwlzlwVzmwVvmwFvmwFvmwVvmwVzmwlzlxFzlxV3lx13kyl7kzGDjzmjl0HLn03/q1Yzt15zx2az12L74zdn3td7xnt/qhuHibuDcV9/VQ97QPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPN3OPd3OPd3OPt3ORt7RW9/WcuDdiuHkoeDruN7xz9r34cv45Lr146nw4pjs4Yno4Hvk323g3mTe3GHe22De2WDe2F/f11/f11/f1l/f1l7f1l7f1l/f11/f11/f2F/f2V/e22De3GDe3mLe32vg4Hjj4Ybn4ZXr4qbv47f04Mr4z+H3tOPwnOPqg+Lja+DcVd/WQt3RO93PO9zQO9zQO9zQO9zQPNzQPNzQPNvQPNvQPNvQPNvQPNzQPNzQPNzQPNzQPNzQPd3QPt3QR97SW9/YcuHeiuLlouPrueTy0eL35tX568T17LTw7aPr7ZPm7oPh7nTd7mja7mXZ7mTZ7WTZ7WPZ7GPZ7GPZ7GPZ7GPZ7GPZ7GPZ7GPZ7GPZ7WPZ7WPZ7mPZ7mTY72XZ7nDc7n7g7o7l7Z7p7K/v68H05dP4zOH3seLxmODrgd3la9vgWNnbRtfXQNbWQNXWQdTXQdTYQtPYQtPYQtLZQtLZQtLZQtLZQtLZQtLZQtPYQtPYQtTYQtXXQ9XXRNbXTdjYX9rddNziit7ooOHtt+Pzz+L45dj57cn18Lrw8qnr85nm9Ijh9nnc92zY92jX92fX92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92jX9nTb9YPf9JPk8qPp8LTu7cX05NX4x9/4rN/yldztf9nobNbkW9PgTNHdRc/cRs7dRs3eR8zfSMvfSMrgSMrgScrhScnhScnhScrhSMrgSMrgSMvfSMzfSM3eSc7dStDdU9LeZNXidtfmitrqn93vteD0zOD54tf568n177vx8qzs85zn9Ivi9nzd927Z92nX92fX92fW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92rX9nbb9YXg9JXl8qXq77Xv68T04NT4w9z4qdv0k9jvf9TrbdHnXs7lUsviSsniSsfjS8bkTMXlTcPmTsPnTsLoT8HoT8HoT8HoT8HoTsLoTsPnTsTmTcXlTcbkTcjjT8rjWc3kZ9DmeNPpitbtndrxst31yN7539X56cn27rzx8q3s857n9I7j9X/e93HZ92nX92fX92fW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW923Y9nrc9Yjh9Jfl8qfq7rbv6MT03NL4v9n4pdj1kdTxftDtb83rYsnpV8boUMTnT8HoUMDqUb7rUr3sU7ztU7vuVLrvVLrvVLrvVLrvU7vuU7ztUr3sUr7rUcDqUsLpVMXoXsjpasvqec/sidPvm9fyrtr2xNv529T55sn27b3x8a/t86Ho9JHk9YPf9nXb92vY92fX92fW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92jX9nLa9X7e9Izi85rm8qnr7bfw5cT12dD5u9f5o9X2j9Hyfs3wcMnuZcXtXMLsVr/sU73tVLvuVbnwVrfxV7byV7XzWLX0WLT0WLT0WLX0V7XzV7byVrfxVbnwVbvuVb3tWcDsYsTtbMfuecvviM/xmNPzq9j3wNn519L55Mj2673y8LHt86Pp9JXl9Yfh9nrd92/Z92jX92fW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92fW923Y9njc9YTf9JDj857n8azs67jw48T11c/5uNX5odP3j870f8rycsbwaMLwYb/wW7zwWLnxV7fyWLX0WbP1WrL2W7H3W7D4W7D4W7D4W7D4W7H3WrL2WbP1WLX0WLfyWbrxXr3wZcDwbsTwecjxhszzltH1p9X3vNb609D54cf26b7y77Pu8qbq85nm9I3i9YHf9nbb923Y92jX92bW92bW92bW92bW92bW92bW92bW92bW92bW92bW92fX92zY9nXb9X/e9Yrh9Jbl86Pp76/t6Lrx4MT20c75tdP5n9H3jsz1gMjzdMTza8DyZL3yX7rzXLf0WrT1WrL2W7H3XK/5Xa76Xa36Xa37Xa37Xa36Xa76XK/5W7H3WrL2W7X1Xbf0YbrzZ77zb8HyecXzhcr0lM72pNP4uNT6z8/53cf35r7z7bXv8qrr857o9JPk9Yjh9X/e9nbb927Z92nX92fW92bW92bW92bW92bW92bW92bW92fW92nX927Z9nXb9n7d9Yfg9JHk85zn8qjq7bLu5rzy3MX2zc35s9H6n8/4j8v2gsf1d8P0br/0aLz0Y7j1YLb2XrP3XbH4Xa/5Xa76Xq37Xqz7Xqz8Xqz8Xqz7Xq37Xa76Xa/5XbH4XrP3Ybb2ZLn1arz0ccD0esT0hcj1ksz3odD5tdL6y8352cb34r/06rfw8K7t8qXp85vm9JHj9Yjh9YHe9nrc9nTb93DZ923Y92vY92rX92rX92vY923Y93DZ9nTb9nrc9YDe9Yjh9JDj85nm86Pp8K3s6rXw4r3z2cX3ycz5sc/6ns75kcr3hMb2esL2cr/1bLz2Z7n2ZLb3YbT4YLL4X7D5X6/6X677X637X638X638X637X677X6/6X7D5YLL4YrT4ZLb3aLn2bbz2dL/1fMP2hsf2ksv4oM/5stD6x8v61cb33sD05rnx7LLu8avs86Pp85vm9JPk9Izi9Yfg9YLf9n7d9nvd9nnc9njc9njc9nnc9nvd9n7d9YLf9Yfg9Izi9JPk85rm86Lp8arr7LLu5rnx3r/01cX3xsv5sM36n836k8r4iMb3f8P3d8D2cb32bLr3aLf3ZrX4ZLP4YrL5YbH6YbD6Ya/6Ya/7Ya/7Ya/6YbD6YbH6YrL5ZLP4ZrX4abj3bLr3cr32eMD2gMP3icb3lMr4oM76sM76w8r60cb42cH24bzz57fw7bHu8Kvs8qXq85/o85nm9JTk9JDj9I3i9Yrh9Yjh9Yfg9Yfg9Yjh9Yrh9I3i9JDj9JTk85nm85/o8qXq8Kvs7bHu57bw4bzz2cH10Mb4wsr6r8z6oc36lsr5jcf4hcT4fsH3eL/3c7z3b7r3bLj4arf4aLX4ZrT5ZrT5ZbP5ZbP5ZbP5ZbP5ZrT5ZrT5aLX4arf4bLj4b7r3c7z3eL/3fsH3hcT4jcf4l8r5oc36sMz6v8n6zMb51MP327/14bvz5rfx6rPv7q/t8Kvs8qbq8qPp85/o853n85vm85nm85nm85nm85nm85vm853n85/o8qPp8qbq8Kvs7q/t6rPv5rfx4bvz27/11MP3zMb5v8n6sMv6pMz6m8v6k8n5jMb5hsT4gcL4fMD4eb74db34c7v4cbr4b7n4brn4bbj4bbj4bbj4bbj4brn4b7n4cbr4c7v4db34eb74fMD4gcL4hsT4jMb5k8n5m8v6pMz6sMv6u8n6xsf5zsT41ML22b/13rzz4rny5bfx6LTv67Lu7a/t7q3t76zs8Krs8Knr8Knr8Knr8Knr8Krs76zs7q3t7a/t67Lu6LTv5bfx4rny3rzz2b/11ML2zsT4xsf5u8n6sMr6qMv6ocv7m8v6lsn6kcf5jcb5icX5hsT5hML4gcH4f8H4fsD4fcD4fL/4fL/4fL/4fL/4fcD4fsD4f8H4gcH4hML4hsT5icX5jcb5kcf5lsn6m8v6ocv7qMv6sMr6uMn6wMf6x8b5zMT40MP31MH217/12r703Lz03rvz4Lry4rny47jx5Lfx5Lfx5bbx5bbx5Lfx5Lfx47jx4rny4Lry3rvz3Lz02r7017/11MH20MP3zMT4x8b5wMf6uMn6ssn6rcr6qcr6pcv6osv6n8r6nMr6msr6mMn6lsj6lcj6lMj6k8f6ksf6kcf5kcf5kcf5kcf5ksf6k8f6lMj6lcj6lsj6mMn6msr6nMr6n8r6osv6pcv6qcr6rcr6ssn6tsn6usj6vsf6wcf5xMb5x8X5ycX4y8T4zcP4zsP3z8L30ML30cH30sH20sH20sH20sH20sH20sH20cH30ML3z8L3zsP3zcP4y8T4ycX4x8X5xMb5wcf5vsf6usj6tsn6s8n6sMn6rsr6rMr6q8r6qcr6p8v6psv6pMv6o8v6osv6ocv6ocv6oMv6oMv6oMv6oMv6oMv6oMv6ocv6ocv6osv6o8v6pMv6psv6p8v6qcr6q8r6rMr6rsr6sMn6ssn6tMn6tsj6uMj6usj6vMj6vsf6v8f6wcf5wsb5w8b5xMb5xcb5xcb5xsb5xsX5xsX5xsX5xsX5xsb5xcb5xcb5xMb5w8b5wsb5wcf5v8f6vsf6vMj6usj6uMj6tsj6tMn6';
let sharedGeo = null;
function pearlGeometry() {
  if (sharedGeo) return sharedGeo;
  const g = Uint8Array.from(atob(GRAD), c => c.charCodeAt(0)), GW = 64, GH = 32;
  const px = (x, y, k) => g[(Math.min(GH - 1, Math.max(0, y)) * GW + ((x % GW) + GW) % GW) * 3 + k];
  const geo = new THREE.SphereGeometry(1, 128, 64), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const u = (Math.atan2(x, z) + Math.PI) / (2 * Math.PI) * GW - 0.5, v = (Math.asin(Math.max(-1, Math.min(1, y))) + Math.PI / 2) / Math.PI * (GH - 1);
    const x0 = Math.floor(u), fx = u - x0, y0 = Math.min(GH - 2, Math.floor(v)), fy = Math.min(1, v - y0);
    for (let k = 0; k < 3; k++) {
      const a = px(x0, y0, k) * (1 - fx) + px(x0 + 1, y0, k) * fx, b = px(x0, y0 + 1, k) * (1 - fx) + px(x0 + 1, y0 + 1, k) * fx;
      col[i * 3 + k] = (a * (1 - fy) + b * fy) / 255;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return (sharedGeo = geo);
}

/* ---------- dot-matrix face ---------- */
const DOT = { step: 0.026, r: 0.0105, x0: -0.5, x1: 0.5, y0: -0.5, y1: 0.42 };
function makeDots(material) {
  const pts = [];
  for (let y = DOT.y0; y <= DOT.y1 + 1e-6; y += DOT.step)
    for (let x = DOT.x0; x <= DOT.x1 + 1e-6; x += DOT.step) if (x * x + y * y < 0.6) pts.push({ x, y, s: 0, speed: 0.22 + Math.random() * 0.4 });
  const geo = new THREE.SphereGeometry(1, 10, 6); geo.scale(1, 1, 0.45);
  const mesh = new THREE.InstancedMesh(geo, material, pts.length);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.renderOrder = 3;
  const z = new THREE.Vector3(0, 0, 1), n = new THREE.Vector3();
  pts.forEach(p => {
    n.set(p.x, p.y, Math.sqrt(Math.max(0, 1 - p.x * p.x - p.y * p.y))).normalize();
    p.q = new THREE.Quaternion().setFromUnitVectors(z, n); p.pos = n.clone().multiplyScalar(1.004);
  });
  return { mesh, pts, m: new THREE.Matrix4(), v: new THREE.Vector3() };
}
function dotOn(x, y, open, smile, blinkL, blinkR) {
  for (const [ex, b] of [[-0.29, blinkL], [0.29, blinkR]]) {          // rounded-square eyes that squash to a line
    const rx = 0.115, ry = 0.135, k = 1 - Math.min(1, b * 1.15), dx = x - ex, dy = y - 0.18;
    if (k < 0.15) { if (Math.abs(dy) <= DOT.step * 0.5 && Math.abs(dx) <= rx * 0.9) return true; }
    else if ((dx / rx) ** 4 + (dy / (ry * k)) ** 4 <= 1) return true;
  }
  const fade = Math.min(1, open / 0.28);
  if (fade < 0.98) {                                                    // smile arc
    const R = 0.17 * (1 + smile * 0.3), cy = -0.15 + R, spread = (0.95 + smile * 0.3) * (1 - fade * 0.6);
    const d = Math.hypot(x, y - cy), ang = Math.atan2(x, -(y - cy));
    if (Math.abs(d - R) <= 0.02 && Math.abs(ang) <= spread) return true;
  }
  if (open > 0.02) {                                                    // open mouth
    const w = 0.075 + open * 0.09, h = 0.016 + open * 0.14, cy = -0.13 - h;
    if ((x / w) ** 2 + ((y - cy) / h) ** 2 <= 1) return true;
  }
  return false;
}

/* ---------- styles and markup inside the component ---------- */
const CSS = `
  :host { display: block; position: relative; width: 320px; height: 420px; contain: layout paint; -webkit-tap-highlight-color: transparent; }
  :host([hidden]) { display: none; }
  .stage { position: absolute; inset: 0; }
  .frost { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%);
    background: rgba(255,255,255,.22); -webkit-backdrop-filter: blur(8px) saturate(1.15); backdrop-filter: blur(8px) saturate(1.15); }
  canvas { position: absolute; display: block; }
  /* the lilac/blue shadow sits on its own circle behind the pearl: Safari won't draw a CSS drop-shadow filter on a WebGL canvas */
  .glow { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
  :host(:not([shadow="off"])) .glow { box-shadow: 0 4px 30px rgba(193,114,250,.5), -6px 4px 26px rgba(110,170,255,.32); }
  .hit { position: absolute; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%); cursor: pointer; }
  .cam { position: absolute; left: 50%; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 7px;
    height: 32px; padding: 0 14px 0 11px; border-radius: 999px; border: 1px solid rgba(225,221,220,.9); cursor: pointer;
    background: rgba(255,255,255,.82); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); color: #131313;
    font: 500 12px/1 'Inter', system-ui, -apple-system, sans-serif; letter-spacing: .01em; white-space: nowrap;
    box-shadow: 0 6px 18px rgba(30,28,25,.08); transition: background .15s, border-color .15s, opacity .2s; }
  .cam:hover { background: #CAE9DF; border-color: #CAE9DF; }
  .cam:focus-visible { outline: 2px solid #131313; outline-offset: 2px; }
  .cam[disabled] { opacity: .6; cursor: progress; }
  .cam svg { width: 15px; height: 15px; flex: none; }
  .cam .dot { width: 7px; height: 7px; border-radius: 50%; background: #e5484d; display: none; animation: pulse 1.4s ease-in-out infinite; }
  :host([data-camera="on"]) .cam .dot { display: block; }
  :host([data-camera="on"]) .cam svg { display: none; }
  :host([camera="off"]) .cam, :host([camera="off"]) .note { display: none; }
  .note { position: absolute; left: 50%; margin: 0; transform: translateX(-50%); width: max-content; max-width: 96%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font: 400 11px/1.35 'Inter', system-ui, -apple-system, sans-serif; color: #6F6F6F; pointer-events: none; opacity: 0; transition: opacity .25s; }
  .note.on { opacity: 1; }
  :host([layout="corner"]) .cam { left: 16px; transform: none; }
  :host([layout="corner"]) .note { left: 16px; transform: none; text-align: left; max-width: calc(100% - 32px); }
  @keyframes pulse { 50% { opacity: .35; } }
  @media (prefers-reduced-motion: reduce) { .cam .dot { animation: none; } }
`;
const CAM_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="1.5" y="4" width="9.5" height="8" rx="2"/><path d="M11 7l3.5-2v6L11 9"/></svg>';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));

class ShepsPearl extends HTMLElement {
  static get observedAttributes() { return ['label', 'camera']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>
      <div class="stage" part="stage">
        <div class="glow" part="glow"></div>
        <div class="frost" part="frost"></div>
        <canvas part="canvas" role="img" aria-label="A glass pearl with a dot face that follows your cursor"></canvas>
        <div class="hit"></div>
        <p class="note" part="note" aria-live="polite"></p>
        <button class="cam" part="camera-button" type="button"><span class="dot"></span>${CAM_ICON}<span class="lbl"></span></button>
      </div>`;
    this.$ = s => root.querySelector(s);
    this.T = { yaw: 0, pitch: 0, roll: 0, blinkL: 0, blinkR: 0, jaw: 0, smile: 0.35 };
    this.C = { ...this.T };
    this.mode = 'mouse';                 // 'mouse' | 'camera'
    this.lastMove = -1e9; this.nextBlink = 1200 + Math.random() * 2000; this.beat = { until: 0, wink: false, oh: false };
    this.visible = true; this.raf = 0;
  }

  connectedCallback() {
    if (this.renderer) return;
    this.setLabel();
    this.$('.cam').addEventListener('click', () => this.mode === 'camera' ? this.stopCamera() : this.startCamera());
    this.$('.hit').addEventListener('pointerdown', () => this.react());   // on press, not release, so the wink lands right away
    this.onMove = e => {
      if (e.pointerType === 'touch') return;
      if (this.getAttribute('follow') === 'element') { const r = this.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; }
      this.px = e.clientX; this.py = e.clientY; this.lastMove = performance.now();
    };
    this.onLeave = () => { this.lastMove = -1e9; };
    addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    this.build();
    this.io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.loop(); });
    this.io.observe(this);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.resize(); this.loop();
  }

  disconnectedCallback() {
    removeEventListener('pointermove', this.onMove);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    this.io?.disconnect(); this.ro?.disconnect(); cancelAnimationFrame(this.raf);
    this.stopCamera(true);
    this.renderer?.dispose(); this.renderer = null;
  }

  attributeChangedCallback() { this.setLabel(); this.resize(); }
  setLabel(text) { const l = this.$('.lbl'); if (l) l.textContent = text || (this.mode === 'camera' ? 'Stop mirroring' : (this.getAttribute('label') || 'Mirror my face')); }
  note(text, ms = 3200) { const n = this.$('.note'); n.textContent = text; n.classList.toggle('on', !!text); clearTimeout(this.noteT); if (text && ms) this.noteT = setTimeout(() => n.classList.remove('on'), ms); }

  /* ---------- 3D ---------- */
  build() {
    const canvas = this.$('canvas');
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = this.scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50); this.camera.position.set(0, 0, 6.2);
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-2.5, 3, 4); scene.add(key);
    const back = new THREE.DirectionalLight(0xd9c2ff, 1.2); back.position.set(3, -1, -2); scene.add(back);
    scene.add(new THREE.HemisphereLight(0xe8fbff, 0xf3e4ff, 0.6));
    this.head = new THREE.Group(); this.head.scale.setScalar(1.08); scene.add(this.head);
    const geo = pearlGeometry();
    const pearl = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({        // frosted: a little see-through over the blurred disc
      vertexColors: true, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.6,
      iridescence: 0.3, iridescenceIOR: 1.3, iridescenceThicknessRange: [220, 520], emissive: new THREE.Color('#1c1626'),
      transparent: true, opacity: 0.84
    }));
    pearl.renderOrder = 1; this.head.add(pearl);
    const rim = new THREE.Mesh(geo, new THREE.ShaderMaterial({              // light edge and a milky lower half
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV;
        void main(){
          vec3 n = normalize(vN); float ndv = max(dot(n, normalize(vV)), 0.);
          float edge = pow(1. - ndv, 9.) * 1.4, glow = pow(1. - ndv, 2.4) * 0.35;
          float milk = 0.10 + 0.55 * smoothstep(0.55, -0.85, n.y);
          gl_FragColor = vec4(mix(vec3(.918, .851, 1.), vec3(1.), clamp(edge + milk * 1.5, 0., 1.)), clamp(edge + glow + milk, 0., 1.));
        }`,
      transparent: true, depthWrite: false
    }));
    rim.scale.setScalar(1.002); rim.renderOrder = 2; pearl.add(rim);
    // drawn after the glass, so only the parts that sit proud of the surface show (no grey ghost of the sunk-in part)
    const ink = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.12, transparent: true });
    this.dots = makeDots(ink); this.head.add(this.dots.mesh);
    // smooth face: the eyes, smile and open mouth from the Blender model, at the same sizes and positions
    const ball = new THREE.SphereGeometry(1, 48, 24);
    this.eyes = [[-0.27, 0.13864353], [0.27, -0.13864353]].map(([x, qy]) => {
      const e = new THREE.Mesh(ball, ink);
      e.position.set(x, 0.17, 0.91273415); e.quaternion.set(-0.08630756, qy, x < 0 ? 0.01212974 : -0.01212974, 0.9864999); e.scale.set(0.075, 0.135, 0.05);
      this.head.add(e); return e;
    });
    const R = 0.1264, cy = -0.023 + R, A = 0.85;                     // the smile: a round tube bent along an arc
    const arc = new THREE.CatmullRomCurve3(Array.from({ length: 17 }, (_, i) => { const a = -A + 2 * A * i / 16; return new THREE.Vector3(Math.sin(a) * R, cy - Math.cos(a) * R, 0); }));
    const tube = new THREE.TubeGeometry(arc, 64, 0.0222, 16, false);
    const cap = new THREE.SphereGeometry(0.0222, 16, 12);
    this.mouth = new THREE.Group(); this.mouth.position.set(0, -0.10700939, 1.01374388); this.head.add(this.mouth);
    this.mouth.add(new THREE.Mesh(tube, ink));
    for (const t of [0, 1]) { const c = new THREE.Mesh(cap, ink); c.position.copy(arc.getPoint(t)); this.mouth.add(c); }
    this.mouthOpen = new THREE.Mesh(ball, ink);
    this.mouthOpen.position.set(0, -0.16, 0.97511703); this.mouthOpen.quaternion.set(-0.07845911, 0, 0, 0.99691743); this.mouthOpen.scale.set(0.12, 0.1, 0.04);
    this.head.add(this.mouthOpen);
    [...this.eyes, this.mouthOpen].forEach(o => o.renderOrder = 3); this.mouth.traverse(o => o.renderOrder = 3);
  }

  // smile and open mouth: the smile scales in place, then gives way to the open mouth, which grows down from the smile line
  mouthPose(open, smile) {
    const m = this.mouth, o = this.mouthOpen;
    // one or the other, never both: the open mouth replaces the smile line. A little hysteresis
    // (on above 0.06, off below 0.03) stops it flicking between the two on small movements.
    this.mouthIsOpen = this.mouthIsOpen ? open > 0.03 : open > 0.06;
    m.visible = !this.mouthIsOpen; o.visible = this.mouthIsOpen;
    m.scale.set(1 + smile * 0.35, 1 + smile * 0.25, 1);
    const h = 0.1 * (0.15 + open * 1.25), y = -0.10700939 + 0.012 - h;
    o.scale.set(0.12 * (0.45 + open * 0.75), h, 0.04);
    o.position.set(0, y, Math.sqrt(Math.max(0, 1 - y * y)) + (0.97511703 - Math.sqrt(1 - 0.16 * 0.16)));
  }

  resize() {
    if (!this.renderer) return;
    const r = this.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    // Layout, top to bottom: the pearl, an 80px gap, the camera button, a 6px gap, the status line.
    // The pearl is drawn in a square canvas where it fills 65% of the width (2 * 1.08 / (2 * 6.2 * tan 15°)).
    const GAP = 80, BTN = 32, NOTE_GAP = 6, NOTE = 16, FILL = 0.65;
    if (this.getAttribute('layout') === 'corner') {
      // layout="corner": the pearl sits dead centre; the camera button is pinned bottom-left with the status line above it
      const d = Math.max(1, Math.min(w * 0.5355, h * 0.34425)), size = d / FILL, cx = w / 2, cy = h / 2;
      this.renderer.setSize(size, size, false);
      this.camera.aspect = 1; this.camera.zoom = 1; this.camera.updateProjectionMatrix();
      Object.assign(this.$('canvas').style, { width: size + 'px', height: size + 'px', left: cx - size / 2 + 'px', top: cy - size / 2 + 'px' });
      for (const [sel, k] of [['.glow', 0.98], ['.frost', 0.95], ['.hit', 1]]) Object.assign(this.$(sel).style, { width: d * k + 'px', height: d * k + 'px', left: cx + 'px', top: cy + 'px' });
      this.$('.cam').style.top = h - 16 - BTN + 'px';
      this.$('.note').style.top = h - 16 - BTN - NOTE_GAP - NOTE + 'px';
      this.pearlY = cy;
      return;
    }
    const withButton = this.getAttribute('camera') !== 'off', below = withButton ? GAP + BTN + NOTE_GAP + NOTE : 0;
    const size = Math.max(1, Math.min(w, (h - below) / FILL)), d = size * FILL;        // canvas size, pearl diameter
    const top = (h - (d + below)) / 2, cx = w / 2, cy = top + d / 2;                     // the whole group is centred
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1; this.camera.zoom = 1; this.camera.updateProjectionMatrix();
    Object.assign(this.$('canvas').style, { width: size + 'px', height: size + 'px', left: cx - size / 2 + 'px', top: cy - size / 2 + 'px' });
    for (const [sel, k] of [['.glow', 0.98], ['.frost', 0.95], ['.hit', 1]]) Object.assign(this.$(sel).style, { width: d * k + 'px', height: d * k + 'px', left: cx + 'px', top: cy + 'px' });
    this.$('.cam').style.top = top + d + GAP + 'px';
    this.$('.note').style.top = top + d + GAP + BTN + NOTE_GAP + 'px';
    this.pearlY = cy;                                                                    // where the eyes look from
  }

  /* ---------- behaviour ---------- */
  react() {                                   // a click on the pearl: a happy wink
    const now = performance.now(); this.beat = { until: now + 130, smileUntil: now + 600, wink: true, oh: false };   // eye shut for as long as a blink
  }

  updateDots(open, smile, blinkL, blinkR) {
    const { mesh, pts, m, v } = this.dots;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.s += ((dotOn(p.x, p.y, open, smile, blinkL, blinkR) ? 1 : 0) - p.s) * p.speed;
      const s = p.s < 0.12 ? 0 : DOT.r * (0.35 + 0.65 * p.s);
      m.compose(p.pos, p.q, v.set(s, s, s)); mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  loop() {
    if (this.raf || !this.renderer) return;
    const tick = now => {
      this.raf = 0;
      if (!this.renderer || !this.visible) return;
      if (!document.hidden) this.frame(now);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  frame(now) {
    const T = this.T, C = this.C, reduce = reduceMotion();
    if (this.mode === 'camera') this.track(now);
    else {
      const r = this.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + (this.pearlY ?? r.height / 2);
      if (now - this.lastMove < 4000) {                // look at the cursor
        const dx = this.px - cx, dy = this.py - cy, reach = Math.max(innerWidth, innerHeight) * 0.45;
        T.yaw = clamp(dx / reach) * 0.6; T.pitch = clamp(dy / reach) * 0.42; T.roll = -T.yaw * 0.12;
        const near = Math.hypot(dx, dy) / (Math.min(r.width, r.height) * 0.5);   // happier when you're close
        T.smile = 0.35 + 0.45 * clamp(1.6 - near, 0, 1);
      } else {                                          // nobody around: a slow look about
        const t = now / 1000;
        T.yaw = Math.sin(t * 0.37) * 0.28 + Math.sin(t * 0.13) * 0.12; T.pitch = Math.sin(t * 0.29) * 0.1 - 0.04; T.roll = 0; T.smile = 0.35;
      }
      if (now > this.nextBlink) { T.blinkL = T.blinkR = 1; if (now > this.nextBlink + 130) { T.blinkL = T.blinkR = 0; this.nextBlink = now + 2200 + Math.random() * 3200; } }
      T.jaw = 0;
    }
    const beat = now < this.beat.until;
    const k = reduce ? 1 : this.mode === 'camera' ? 0.35 : 0.1, kf = reduce ? 1 : 0.6;
    C.yaw += (T.yaw - C.yaw) * k; C.pitch += (T.pitch - C.pitch) * k; C.roll += (T.roll - C.roll) * k;
    C.smile += ((now < (this.beat.smileUntil || 0) ? 0.8 : T.smile) - C.smile) * 0.15;
    // open quickly, close a little slower, so small mouth movements read clearly without flicker
    C.jaw += (T.jaw - C.jaw) * (reduce ? 1 : T.jaw > C.jaw ? 0.55 : 0.32);
    C.blinkL += (T.blinkL - C.blinkL) * kf; C.blinkR += ((beat && this.beat.wink ? 1 : T.blinkR) - C.blinkR) * kf;   // same easing as a blink
    this.head.rotation.set(C.pitch, C.yaw, C.roll, 'YXZ');
    const open = clamp(C.jaw / 0.5, 0, 1), dotsOn = this.getAttribute('features') === 'dots';
    this.dots.mesh.visible = dotsOn;
    [...this.eyes, this.mouth].forEach(o => o.visible = !dotsOn); if (dotsOn) this.mouthOpen.visible = false;
    if (dotsOn) this.updateDots(open, C.smile, C.blinkL, C.blinkR);
    else {
      this.eyes.forEach((e, i) => e.scale.y = 0.135 * Math.max(0.08, 1 - (i ? C.blinkR : C.blinkL) * 1.1));
      this.mouthPose(open, C.smile);
    }
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------- camera mirroring ---------- */
  async startCamera() {
    if (this.mode === 'camera' || this.starting) return;
    const btn = this.$('.cam');
    const fail = (state, message) => {
      this.starting = false; btn.disabled = false; this.setLabel(); this.dataset.camera = 'off';
      this.note(message, 6000); this.emit(state, message);
    };
    if (!navigator.mediaDevices?.getUserMedia) return fail('error', 'This browser can’t use the camera here.');
    this.starting = true; btn.disabled = true; this.setLabel('Starting camera…'); this.emit('starting');
    this.note('Your camera stays on this device. Nothing is uploaded.', 0);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
    } catch (e) {
      return fail('blocked', e.name === 'NotAllowedError' ? 'Camera access was blocked. You can allow it from the address bar and try again.' : 'Couldn’t open a camera.');
    }
    try {
      if (!this.video) { this.video = document.createElement('video'); this.video.muted = true; this.video.playsInline = true; }
      this.video.srcObject = this.stream; await this.video.play();
      if (!ShepsPearl.landmarker) ShepsPearl.landmarker = (async () => {
        const { FilesetResolver, FaceLandmarker } = await import(MEDIAPIPE);
        const fs = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
        return FaceLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numFaces: 1,
          outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true
        });
      })();
      this.face = await ShepsPearl.landmarker;
      if (!this.stream) return;                         // stopped while loading
    } catch (e) {
      ShepsPearl.landmarker = null; this.stopCamera(true);
      return fail('error', 'Couldn’t load face tracking. Check your connection and try again.');
    }
    this.mode = 'camera'; this.starting = false; btn.disabled = false; this.dataset.camera = 'on'; this.setLabel();
    this.note('Mirroring you. Turn your head, blink, smile.', 3000); this.emit('on');
  }

  stopCamera(silent) {
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    if (this.video) this.video.srcObject = null;
    const was = this.mode === 'camera';
    this.mode = 'mouse'; this.dataset.camera = 'off'; this.lastT = -1;
    Object.assign(this.T, { blinkL: 0, blinkR: 0, jaw: 0 });
    if (this.isConnected) { this.$('.cam').disabled = false; this.setLabel(); }
    if (was && !silent) { this.note(''); this.emit('off'); }
  }

  track(now) {
    const v = this.video, T = this.T;
    if (!this.face || !v || v.readyState < 2 || v.currentTime === this.lastT) return;
    this.lastT = v.currentTime;
    const r = this.face.detectForVideo(v, now), mx = r.facialTransformationMatrixes?.[0];
    if (!mx) { T.yaw *= 0.9; T.pitch *= 0.9; T.roll *= 0.9; T.blinkL = T.blinkR = T.jaw = 0; return; }
    const E = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().fromArray(mx.data), 'YXZ');
    T.yaw = -E.y * 1.2; T.pitch = E.x * 1.2; T.roll = -E.z * 1.2;           // mirrored, like looking in a mirror
    const bs = {}; (r.faceBlendshapes?.[0]?.categories || []).forEach(c => bs[c.categoryName] = c.score);
    T.blinkL = bs.eyeBlinkRight || 0; T.blinkR = bs.eyeBlinkLeft || 0;
    // mouth: jawOpen alone misses talking-sized movements, so add how far the lips part
    // (jawOpen minus mouthClose, plus lower lip down / upper lip up), which picks up small openings
    const avg = (a, b) => ((bs[a] || 0) + (bs[b] || 0)) / 2;
    const lips = avg('mouthLowerDownLeft', 'mouthLowerDownRight') * 0.6 + avg('mouthUpperUpLeft', 'mouthUpperUpRight') * 0.3;
    const open = Math.max(0, (bs.jawOpen || 0) - (bs.mouthClose || 0) * 0.7) * 1.25 + lips;
    T.jaw = open < 0.025 ? 0 : clamp(open, 0, 1);                        // a tiny dead zone just for sensor noise
    T.smile = clamp(avg('mouthSmileLeft', 'mouthSmileRight') * 1.3, 0, 1);
  }

  emit(state, message) { this.dispatchEvent(new CustomEvent('pearl-camera', { detail: { state, message }, bubbles: true, composed: true })); }
}

if (!customElements.get('sheps-pearl')) customElements.define('sheps-pearl', ShepsPearl);
export { ShepsPearl };
