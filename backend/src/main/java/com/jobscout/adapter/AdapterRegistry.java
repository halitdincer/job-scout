package com.jobscout.adapter;

import com.jobscout.domain.Platform;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AdapterRegistry {

    private final Map<Platform, Adapter> byPlatform = new EnumMap<>(Platform.class);

    public AdapterRegistry(List<Adapter> adapters) {
        for (Adapter a : adapters) {
            Adapter prev = byPlatform.put(a.platform(), a);
            if (prev != null) {
                throw new IllegalStateException(
                    "Two adapters registered for " + a.platform() +
                    ": " + prev.getClass() + " and " + a.getClass());
            }
        }
    }

    public Adapter get(Platform platform) {
        Adapter a = byPlatform.get(platform);
        if (a == null) throw new IllegalArgumentException("No adapter for " + platform);
        return a;
    }
}
