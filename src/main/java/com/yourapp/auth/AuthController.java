package com.yourapp.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final JwtUtil jwtUtil;

    public AuthController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /**
     * Called by React after it validates credentials against localStorage.
     * React sends { email, role, id } — we just sign and return a JWT.
     * When you add a DB later, validate credentials here instead.
     */
    @PostMapping("/token")
    public ResponseEntity<?> issueToken(@RequestBody TokenRequest req) {
        if (req.email() == null || req.role() == null || req.id() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing fields"));
        }
        String token = jwtUtil.generateToken(req.id(), req.email(), req.role());
        return ResponseEntity.ok(Map.of("token", token));
    }

    /**
     * Called by ProtectedRoute on every protected page load.
     * Validates the JWT and returns the role from the token claims.
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verify(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing token"));
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired token"));
        }
        // Extract claims
        String id    = jwtUtil.extractUserId(token);
        String email = jwtUtil.extractEmail(token);
        String role  = jwtUtil.extractRole(token);

        return ResponseEntity.ok(Map.of(
            "user", Map.of("id", id, "email", email, "role", role)
        ));
    }

    record TokenRequest(String id, String email, String role) {}
}
