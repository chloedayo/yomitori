package com.yomitori.config

import com.yomitori.service.StartupJobService
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component

@Component
class AppStartupListener(private val startupJobService: StartupJobService) {

    @EventListener(ApplicationReadyEvent::class)
    fun onReady() = startupJobService.submitAll()
}
