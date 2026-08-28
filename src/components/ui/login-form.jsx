import { useEffect, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { User, Lock, ArrowRight } from "lucide-react";

// Vertex shader source code
const vertexSmokeySource = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

// Fragment shader source code for the smokey background effect
const fragmentSmokeySource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution;
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.5;

    // Normalize mouse input (0.0 - 1.0) and remap to -1.0 ~ 1.0
    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    // Apply distortion for a wavy, smokey effect
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    // Create a glowing wave pattern
    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);

    fragColor = vec4(u_color * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

/**
 * A mapping from blur size names to Tailwind CSS classes.
 */
const blurClassMap = {
  none: "backdrop-blur-none",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
  "2xl": "backdrop-blur-2xl",
  "3xl": "backdrop-blur-3xl",
};

/**
 * A React component that renders an interactive WebGL shader background.
 */
export function SmokeyBackground({
  backdropBlurAmount = "sm",
  color = "#1E40AF", // Default dark blue
  className = "",
}) {
  const canvasRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Helper to convert hex color to RGB (0-1 range)
  const hexToRgb = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;
    return [r, g, b];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSmokeySource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSmokeySource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
    const iTimeLocation = gl.getUniformLocation(program, "iTime");
    const iMouseLocation = gl.getUniformLocation(program, "iMouse");
    const uColorLocation = gl.getUniformLocation(program, "u_color");

    let startTime = Date.now();
    const [r, g, b] = hexToRgb(color);
    gl.uniform3f(uColorLocation, r, g, b);

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);

      const currentTime = (Date.now() - startTime) / 1000;

      gl.uniform2f(iResolutionLocation, width, height);
      gl.uniform1f(iTimeLocation, currentTime);
      gl.uniform2f(iMouseLocation, isHovering ? mousePosition.x : width / 2, isHovering ? height - mousePosition.y : height / 2);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    const handleMouseMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      setMousePosition({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseenter", handleMouseEnter);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    render();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseenter", handleMouseEnter);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isHovering, mousePosition, color]);

  const finalBlurClass = blurClassMap[backdropBlurAmount] || blurClassMap["sm"];

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className={`absolute inset-0 ${finalBlurClass}`}></div>
    </div>
  );
}

function GoogleAuthSection({ enabled, loading, mode, onSuccess, onError }) {
  if (!enabled) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-300 dark:bg-white/20" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-gray-300">
          or
        </span>
        <span className="h-px flex-1 bg-slate-300 dark:bg-white/20" />
      </div>
      <div
        className={`flex min-h-11 justify-center ${loading ? "pointer-events-none opacity-60" : ""}`}
        aria-busy={loading}
      >
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          text={mode === "register" ? "signup_with" : "signin_with"}
          shape="rectangular"
          size="large"
          theme="outline"
          width="304"
        />
      </div>
    </div>
  );
}

/**
 * A glassmorphism-style login form component with animated labels and Google login.
 */
export function LoginForm({
  onSubmit,
  error = "",
  loading = false,
  logo = "ReliefOpt",
  className = "",
  onSwitchToRegister,
  googleEnabled = false,
  onGoogleSuccess,
  onGoogleError,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (onSubmit) onSubmit({ username, password });
  }

  return (
    <div className={`w-full max-w-sm p-8 space-y-6 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30 ${className}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{logo}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">Sign in to continue</p>
      </div>
      <form className="space-y-8" onSubmit={handleSubmit}>
        {/* Username Input with Animated Label */}
        <div className="relative z-0">
          <input
            type="text"
            id="floating_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block py-2.5 px-0 w-full text-sm text-slate-900 dark:text-white bg-transparent border-0 border-b-2 border-slate-300 dark:border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-teal-500 dark:focus:border-blue-500 peer"
            placeholder=" "
            autoComplete="username"
            required
          />
          <label
            htmlFor="floating_username"
            className="absolute text-sm text-slate-500 dark:text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-teal-600 dark:peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            <User className="inline-block mr-2 -mt-1" size={16} />
            Username
          </label>
        </div>
        {/* Password Input with Animated Label */}
        <div className="relative z-0">
          <input
            type="password"
            id="floating_password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block py-2.5 px-0 w-full text-sm text-slate-900 dark:text-white bg-transparent border-0 border-b-2 border-slate-300 dark:border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-teal-500 dark:focus:border-blue-500 peer"
            placeholder=" "
            required
          />
          <label
            htmlFor="floating_password"
            className="absolute text-sm text-slate-500 dark:text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-teal-600 dark:peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
          >
            <Lock className="inline-block mr-2 -mt-1" size={16} />
            Password
          </label>
        </div>

        <div className="flex items-center justify-between">
          <a href="#" className="text-xs text-slate-500 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white transition" onClick={(e) => e.preventDefault()}>
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full flex items-center justify-center py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-teal-500 transition-all duration-300"
        >
          {loading ? "Signing in..." : "Sign In"}
          <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
        </button>

        <GoogleAuthSection
          enabled={googleEnabled}
          loading={loading}
          mode="login"
          onSuccess={onGoogleSuccess}
          onError={onGoogleError}
        />

        {error && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center" role="alert">
            {error}
          </p>
        )}

        {onSwitchToRegister && (
          <p className="text-center text-sm text-slate-600 dark:text-gray-300">
            Don&apos;t have an account?{" "}
            <button type="button" onClick={onSwitchToRegister} className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
              Register
            </button>
          </p>
        )}
      </form>
    </div>
  );
}

/**
 * A floating-label text input matching the glassmorphism style used across the auth forms.
 */
function FloatingField({ id, label, icon, value, onChange, type = "text", autoComplete }) {
  return (
    <div className="relative z-0">
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        className="block py-2.5 px-0 w-full text-sm text-slate-900 dark:text-white bg-transparent border-0 border-b-2 border-slate-300 dark:border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-teal-500 dark:focus:border-blue-500 peer"
        placeholder=" "
        autoComplete={autoComplete}
        required
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-slate-500 dark:text-gray-300 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-teal-600 dark:peer-focus:text-blue-400 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
      >
        {icon}
        {label}
      </label>
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public self-registration form. Always signs up as a Field Worker with no team assignment;
 * an admin can promote the account and assign a team later from the Users panel.
 */
export function RegisterForm({
  onSubmit,
  error = "",
  loading = false,
  logo = "ReliefOpt",
  className = "",
  onSwitchToLogin,
  googleEnabled = false,
  onGoogleSuccess,
  onGoogleError,
}) {
  const [form, setForm] = useState({
    name: "", email: "", username: "", phone: "", password: "", confirmPassword: "",
  });
  const [validationError, setValidationError] = useState("");

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");
    if (!form.name.trim() || !form.email.trim() || !form.username.trim() || !form.phone.trim()) {
      setValidationError("Fill in every field to create an account.");
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setValidationError("Enter a valid email address.");
      return;
    }
    if (form.password.length < 12) {
      setValidationError("Password must contain at least 12 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setValidationError("Password confirmation does not match.");
      return;
    }
    onSubmit?.({
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      phone: form.phone.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
  }

  const displayedError = validationError || error;

  return (
    <div className={`w-full max-w-sm p-8 space-y-6 rounded-2xl bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30 ${className}`}>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{logo}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-300">Create a Field Worker account</p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <FloatingField id="register_name" label="Full Name" value={form.name} onChange={update("name")} autoComplete="name" />
        <FloatingField id="register_email" label="Email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
        <FloatingField id="register_username" label="Username" value={form.username} onChange={update("username")} autoComplete="username" />
        <FloatingField id="register_phone" label="Phone Number" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" />
        <FloatingField id="register_password" label="Password" type="password" value={form.password} onChange={update("password")} autoComplete="new-password" />
        <FloatingField id="register_confirm_password" label="Confirm Password" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} autoComplete="new-password" />

        <p className="text-xs text-slate-500 dark:text-gray-300">
          New accounts start as Field Worker with no team assignment. An admin can update your role and team later.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="group w-full flex items-center justify-center py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 focus:ring-teal-500 transition-all duration-300"
        >
          {loading ? "Creating account..." : "Create Account"}
          <ArrowRight className="ml-2 h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
        </button>

        <GoogleAuthSection
          enabled={googleEnabled}
          loading={loading}
          mode="register"
          onSuccess={onGoogleSuccess}
          onError={onGoogleError}
        />

        {displayedError && (
          <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center" role="alert">
            {displayedError}
          </p>
        )}

        <p className="text-center text-sm text-slate-600 dark:text-gray-300">
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}
