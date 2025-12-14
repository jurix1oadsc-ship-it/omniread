
import { GoogleGenAI, Type } from "@google/genai";
import { Novel, Chapter, SearchFilters, FinderFilters, Review, Character, ReadingSpot, DungeonState, SoulboundArtifact, Comment, LoreEntry } from "../types";
import { getNextKey, markKeyAsRateLimited, getPoolStatus, getGroqKey, isModuleActive } from "./keyManager";
import { checkAndIncrementDailyLimit } from "./storageService";

// MOCK_DATA – Placeholder image generator
const getRandomImage = (seed: number) => `https://picsum.photos/300/450?random=${seed}`;

/**
 * Helper to map raw error messages to user-friendly toasts
 */
const mapErrorToMessage = (error: any): string => {
    const msg = error.message || '';
    if (msg.includes('429') || msg.includes('Quota')) return "Neural network overloaded. Switching nodes...";
    if (msg.includes('503')) return "AI service temporarily unavailable.";
    if (msg.includes('500') && msg.includes('Search')) return "Search tool unavailable. Try again later.";
    if (msg.includes('SAFETY')) return "Content filtered by safety protocols.";
    return "An error occurred in the neural link.";
};

/**
 * Wrapper to handle API Key Rotation, Retries, and User Rate Limiting
 */
async function runGenAI<T>(operation: (ai: GoogleGenAI) => Promise<T>, attempt = 1, skipLimitCheck = false): Promise<T> {
    
    // FAKE_BACKEND: Check Daily Limit for User Actions (skip for background system tasks)
    // TODO: REAL IMPLEMENTATION REQUIRED: Move quota enforcement to backend API gateway.
    if (!skipLimitCheck) {
        const allowed = checkAndIncrementDailyLimit();
        if (!allowed) {
            const msg = "Daily AI Limit Reached. OmniRead conserves resources by limiting daily generations. Please try again tomorrow.";
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('omniread-error', { detail: { message: msg, type: 'error' } }));
            }
            throw new Error(msg);
        }
    }

    const currentKey = getNextKey();
    
    if (!currentKey) {
        const msg = "No API Key found. Please add a key in Profile > Core to enable AI features.";
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('omniread-error', { detail: { message: msg, type: 'error' } }));
        }
        throw new Error(msg);
    }

    const ai = new GoogleGenAI({ apiKey: currentKey });

    try {
        return await operation(ai);
    } catch (error: any) {
        // Check for specific error types
        const isRateLimit = error.message?.includes('429') || error.status === 429 || error.message?.includes('Quota exceeded');
        const isServiceError = error.message?.includes('503') || error.status === 503;
        const isSearchError = error.message?.includes('500') || error.status === 500; // Search tool often throws 500 on failure

        if (isRateLimit || isServiceError || isSearchError) {
             if (attempt <= 5) { // Retry up to 5 times
                 // Only mark key as bad if it's a rate limit. 500s might be tool specific, not key specific.
                 if (isRateLimit) {
                     markKeyAsRateLimited(currentKey);
                 }
                 
                 console.log(`Retrying operation (Attempt ${attempt + 1})... Error: ${error.message}`);
                 
                 // Exponential backoff for 500s/503s
                 if (isServiceError || isSearchError) {
                     await new Promise(r => setTimeout(r, 1000 * attempt)); 
                 }

                 return runGenAI(operation, attempt + 1, skipLimitCheck);
             } else {
                 // Retries exhausted
                 const msg = mapErrorToMessage(error);
                 console.warn(msg);
                 
                 // Dispatch specific toast
                 if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('omniread-error', { detail: { message: msg, type: 'error' } }));
                 }
                 throw error;
             }
        }
        
        throw error;
    }
}

/**
 * Groq AI Execution Engine
 * Uses 'mixtral-8x7b-32768' as the "gpt-oss-120b" equivalent for high quality open source generation.
 */
async function runGroqAI(prompt: string, systemInstruction = "You are a creative web novel writer."): Promise<string> {
    const apiKey = getGroqKey();
    if (!apiKey) throw new Error("No Groq API Key available.");

    // Check limit for Groq as well to be fair, though usually keys are personal.
    // Let's enforce it to prevent abuse of the unified interface.
    const allowed = checkAndIncrementDailyLimit();
    if (!allowed) throw new Error("Daily AI Limit Reached.");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            model: "mixtral-8x7b-32768", // Representing the requested "medium thinking" model
            temperature: 0.7,
            max_tokens: 3000
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Groq Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Enhanced AI Search with Filters
 */
export const searchNovelsAI = async (query: string, filters?: { genre?: string, status?: string }): Promise<Novel[]> => {
  return runGenAI(async (ai) => {
      const model = "gemini-2.5-flash";
      
      let filterContext = "";
      if (filters?.genre && filters.genre !== 'All') filterContext += ` The novels MUST be of the genre: ${filters.genre}.`;
      if (filters?.status && filters.status !== 'All') filterContext += ` The novels MUST have the status: ${filters.status}.`;

      const prompt = `
        You are a web novel aggregator crawler. 
        Generate a list of 6 distinct, creative web novels that match the search query: "${query}".
        ${filterContext}
        If the query is empty, generate trending novels${filters?.genre ? ` in ${filters.genre}` : ''}.
        Mix sources between RoyalRoad, WebNovel, WTR-LAB, Qidian, and Faloo.
        Ensure descriptions are catchy.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                title: { type: Type.STRING },
                author: { type: Type.STRING },
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                source: { type: Type.STRING, enum: ['RoyalRoad', 'WebNovel', 'WTR-LAB', 'Qidian', 'Faloo', 'Munpia', 'Syosetu'] },
                rating: { type: Type.NUMBER },
                status: { type: Type.STRING, enum: ['Ongoing', 'Completed'] },
                chapterCount: { type: Type.INTEGER }
                }
            }
            }
        }
    });

    const data = JSON.parse(response.text || "[]");

    return data.map((item: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      title: item.title,
      author: item.author,
      coverUrl: getRandomImage(index + Math.random() * 1000), // MOCK_DATA
      description: item.description,
      tags: item.tags,
      source: item.source,
      rating: item.rating,
      status: item.status,
      views: `${(Math.random() * 5).toFixed(1)}M`, // MOCK_DATA
      lastUpdated: 'Just now',
      chapters: Array.from({ length: Math.min(item.chapterCount || 20, 40) }, (_, i) => ({
        id: `ch-${i + 1}`,
        title: `Chapter ${i + 1}`,
        number: i + 1,
        releaseDate: '2024-05-20'
      }))
    }));
  }).catch(e => {
      console.error("Search Error", e);
      return [];
  });
};

export const findNovelsByFiltersAI = async (filters: FinderFilters): Promise<Novel[]> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Act as a precise web novel database search engine (The Oracle). 
            Find 12 distinct web novels that match these criteria:

            User's Specific Desire/Vibe: "${filters.description || 'Any'}"
            
            STRICT CONSTRAINTS:
            INCLUDED Genres/Tags: ${[...filters.includedGenres, ...filters.includedTags].join(', ') || 'Any'}
            EXCLUDED Genres/Tags: ${[...filters.excludedGenres, ...filters.excludedTags].join(', ') || 'None'}
            Status: ${filters.status}
            Minimum Rating: ${filters.minRating} stars
            Sort By: ${filters.sortBy}
            
            IMPORTANT:
            - Mix sources: RoyalRoad, WebNovel, Qidian (CN), Faloo (CN), Munpia (KR), Syosetu (JP).
            - TRANSLATE ALL TITLES AND DESCRIPTIONS TO ENGLISH.
            - Do NOT include novels that have ANY of the excluded tags.
            - Ensure the novels closely match the included tags and especially the User's Description.
            
            Return JSON list.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            description: { type: Type.STRING },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            source: { type: Type.STRING, enum: ['RoyalRoad', 'WebNovel', 'WTR-LAB', 'Qidian', 'Faloo', 'Munpia', 'Syosetu'] },
                            rating: { type: Type.NUMBER },
                            status: { type: Type.STRING, enum: ['Ongoing', 'Completed'] },
                            chapterCount: { type: Type.INTEGER }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        return data.map((item: any, index: number) => ({
            id: `finder-${Date.now()}-${index}`,
            title: item.title,
            author: item.author || 'Unknown',
            coverUrl: getRandomImage(index * 42), // MOCK_DATA
            description: item.description,
            tags: item.tags,
            source: item.source,
            rating: item.rating,
            status: item.status,
            views: 'Finder Result',
            lastUpdated: 'Recently',
            chapters: Array.from({ length: Math.min(item.chapterCount || 20, 50) }, (_, i) => ({
                id: `ch-${i + 1}`,
                title: `Chapter ${i + 1}`,
                number: i + 1,
                releaseDate: 'Unknown'
            }))
        }));
    }).catch(() => []);
};

export const searchNovelsWeb = async (query: string): Promise<{novels: Novel[], rawText: string, sources: any[]}> => {
  return runGenAI(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find popular web novels matching this query: "${query}". 
      Focus on finding titles from RoyalRoad, WebNovel, Qidian, Faloo, Munpia, Syosetu.
      List 3-4 top results with a brief description for each.
      Translate any foreign titles/descriptions to English.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const text = response.text || "";

    const extractionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extract a list of novels from this text. Return JSON array with title, author (if found, else 'Unknown'), description. Ensure ALL Text is in ENGLISH. Text: ${text}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        author: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const extracted = JSON.parse(extractionResponse.text || "[]");
    
    const novels: Novel[] = extracted.map((ex: any, i: number) => ({
        id: `web-${Date.now()}-${i}`,
        title: ex.title,
        author: ex.author,
        description: ex.description,
        coverUrl: getRandomImage(i * 55), // MOCK_DATA
        tags: ['Web Result'],
        source: 'Web Search',
        rating: 0,
        status: 'Ongoing',
        views: 'N/A',
        lastUpdated: 'Recently',
        chapters: [],
        webUrl: '#' 
    }));

    if (sources.length > 0 && novels.length > 0) {
        novels.forEach((n, i) => {
            if (sources[i]?.web?.uri) n.webUrl = sources[i].web.uri;
        });
    }

    return { novels, rawText: text, sources };

  }).catch(e => ({ novels: [], rawText: "Failed to search web.", sources: [] }));
};

// NEW: Aggregator Logic with 'updated' support and Auto-Translation
// Background task: skip limit check
export const scanNovelSourceAI = async (source: string, type: 'trending' | 'updated' = 'trending'): Promise<Novel[]> => {
    // Check if Module is Active based on Health
    if (!isModuleActive('scanning')) {
        console.warn("Scanner disabled due to low key pool health.");
        return [];
    }

    // FAKE_BACKEND – Simulating a backend crawler/scraper using AI prompts + Google Search.
    // TODO: REAL IMPLEMENTATION REQUIRED: A real backend would use Puppeteer/Cheerio/API to scrape these sites.
    return runGenAI(async (ai) => {
        let context = "";
        if (['Qidian', 'Faloo'].includes(source)) context = "These are Chinese novel sites. You must find the novels on these specific platforms.";
        if (['Munpia'].includes(source)) context = "This is a Korean novel site. You must find novels from Munpia.";
        if (['Syosetu'].includes(source)) context = "This is a Japanese novel site (Shōsetsuka ni Narō). You must find novels from Syosetu.";

        const query = type === 'trending' 
            ? `Top trending novels on ${source} this week with authors and descriptions. ${context}`
            : `List of web novels on ${source} that updated with new chapters in the last 24 hours. Include chapter numbers and update times. ${context}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "";
        
        const extractionPrompt = `Based on the search results: "${text}", extract a list of 6 novels found on ${source}. 
        ${type === 'updated' ? 'Focus on novels that have a new chapter recently. Extract the latest chapter title/number and time ago.' : ''}
        
        CRITICAL INSTRUCTION:
        If the novel title, description, or tags are in Chinese, Korean, or Japanese, TRANSLATE THEM INTO ENGLISH.
        The output JSON must be 100% English.
        
        Return JSON.`;

        const extraction = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: extractionPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            author: { type: Type.STRING },
                            description: { type: Type.STRING },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            rating: { type: Type.NUMBER },
                            latestChapter: { type: Type.STRING },
                            timeAgo: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(extraction.text || "[]");
        return data.map((item: any, i: number) => {
            const latestCh = item.latestChapter || 'New Chapter';
            const chapters = Array.from({ length: 5 }, (_, idx) => ({
                id: `scan-ch-${idx}`,
                title: idx === 4 ? latestCh : `Chapter ${100 + idx}`,
                number: 100 + idx + 1,
                releaseDate: idx === 4 ? (item.timeAgo || 'Today') : 'Previous'
            }));

            return {
                id: `scan-${source}-${type}-${i}-${Date.now()}`,
                title: item.title,
                author: item.author || 'Unknown',
                coverUrl: getRandomImage(i + (type === 'updated' ? 500 : 100)), // MOCK_DATA
                description: item.description || (type === 'updated' ? 'New chapter available!' : ''),
                tags: item.tags || [source],
                source: source as any,
                rating: item.rating || 4.5,
                status: 'Ongoing',
                views: type === 'updated' ? 'Updated' : 'Trending',
                lastUpdated: item.timeAgo || 'Just now',
                chapters: chapters
            };
        });
    }, 1, true)
    .catch(() => []);
};

export const findReadingSpotsAI = async (lat: number, lng: number): Promise<{spots: ReadingSpot[], rawText: string}> => {
  return runGenAI(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Find the best quiet cafes, libraries, or bookstores suitable for reading books nearby. Give me a list.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    const text = response.text || "";
    
    const extractionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extract list of places from this text. Return JSON with name, address, rating (as string), type. Text: ${text}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        address: { type: Type.STRING },
                        rating: { type: Type.STRING },
                        type: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const extracted = JSON.parse(extractionResponse.text || "[]");
    const spots = extracted.map((ex: any, i: number) => ({
        id: `spot-${i}`,
        name: ex.name,
        address: ex.address,
        rating: ex.rating,
        type: ex.type
    }));

    return { spots, rawText: text };

  }).catch(e => ({ spots: [], rawText: "Failed to find locations." }));
}

export const getRankedNovelsAI = async (category: string): Promise<Novel[]> => {
    let promptModifier = "";
    switch(category) {
        case 'Top Rated': promptModifier = "Generate the highest rated, critically acclaimed web novels. Focus on quality writing and 4.8+ ratings. Include international hits from Qidian and Munpia (translated)."; break;
        case 'Trending': promptModifier = "Generate currently viral and trending web novels with high view counts and recent activity."; break;
        case 'New Arrivals': promptModifier = "Generate brand new, promising web novels released in the last month."; break;
        case 'Completed': promptModifier = "Generate legendary completed web novels that are finished."; break;
        default: promptModifier = "Generate popular web novels.";
    }

    return searchNovelsAI(promptModifier);
}

export const getChapterContentAI = async (novelTitle: string, chapterTitle: string, previousContext: string = ""): Promise<{content: string, context: string}> => {
  const isShortChapter = /prologue|interlude|epilogue|glossary|bonus/i.test(chapterTitle);
  const groqKey = getGroqKey();

  if (isShortChapter && groqKey) {
      console.log("Smart Routing: Using Groq for short chapter.");
      try {
          const prompt = `Write the content for the web novel "${novelTitle}", specifically "${chapterTitle}". Genre: Fantasy/Cultivation. Write approx 600 words. Format with HTML paragraphs (<p>). ENSURE OUTPUT IS IN ENGLISH.`;
          const text = await runGroqAI(prompt);
          return { content: text, context: previousContext }; // Groq simple doesn't update context yet
      } catch (e) {
          console.warn("Groq Smart Route failed, falling back to Gemini.");
      }
  }

  return runGenAI(async (ai) => {
      const model = "gemini-2.5-flash";
      const prompt = `
        Write the content for the web novel "${novelTitle}", specifically "${chapterTitle}".
        The genre is likely fantasy, litrpg, or cultivation.
        Write at least 600 words. Format with HTML paragraphs (<p>).
        Make it engaging, with dialogue and action typical of web novels.
        
        Previous Context Summary: ${previousContext || "None yet."}
        
        CRITICAL: The output MUST be in ENGLISH, even if the novel title suggests a foreign origin (Chinese/Korean/Japanese).
        Translate any cultivation terms or idioms into standard English equivalents.
        
        You must return a JSON object with two fields:
        1. "content": The HTML string of the chapter.
        2. "context": An updated 2-3 sentence summary of the plot/characters including the events of this new chapter (The Memory Palace).
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING },
                    context: { type: Type.STRING }
                }
            }
        }
      });
      const data = JSON.parse(response.text || "{}");
      return { 
          content: data.content || "<p>Error generating content.</p>", 
          context: data.context || previousContext 
      };
  }).catch(async (error) => {
      // Fallback for Groq if Gemini fails
      const isQuota = error.message?.includes('429') || error.message?.includes('Quota') || error.message?.includes('Translation Quota');
      if (isQuota && getGroqKey()) {
          console.log("Gemini Quota Exceeded. Falling back to Groq.");
          try {
              if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('omniread-error', { detail: { message: "Gemini Quota depleted. Rerouting to Groq Neural Network...", type: 'info' } }));
              }
              const prompt = `Write the content for the web novel "${novelTitle}", specifically "${chapterTitle}". Genre: Fantasy/Cultivation. Write approx 600 words. Format with HTML paragraphs (<p>). ENSURE OUTPUT IS IN ENGLISH.`;
              const text = await runGroqAI(prompt);
              return { content: text, context: previousContext };
          } catch (groqError) {
              return { content: "<p>All neural pathways are blocked. Please try again later.</p>", context: previousContext };
          }
      }
      return { content: "<p>Failed to load chapter content due to network or API error.</p>", context: previousContext };
  });
};

export const fractureChapterAI = async (novelTitle: string, currentContent: string, twist: string): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            You are rewriting a web novel chapter called "${novelTitle}".
            Original Context: ${currentContent.substring(0, 1000)}...
            
            THE TWIST (FRACTURE): ${twist}
            
            Rewrite the scene assuming this twist happens. 
            Make it dramatic and distinct from the original.
            Approx 600 words. HTML Format <p>.
            Write in English.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "<p>Fracture failed.</p>";
    }).catch(() => "<p>The timeline refused to diverge.</p>");
}

export const getArtifactCommentaryAI = async (artifact: SoulboundArtifact, chapterText: string): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            You are a sentient artifact named ${artifact.name}.
            Type: ${artifact.type}.
            Personality: ${artifact.personality}.
            
            Read this short snippet of the current story: "${chapterText.substring(0, 500)}..."
            
            Give a short, 1-2 sentence reaction to the reader. 
            If you are 'Bloodthirsty', want violence. 
            If 'Wise', give advice. 
            If 'Sarcastic', mock the protagonist.
            English only.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "...";
    }).catch(() => "...");
}

export const analyzeReaderSoulAI = async (history: Novel[]): Promise<{title: string, analysis: string}> => {
    return runGenAI(async (ai) => {
        const historySummary = history.map(n => `${n.title} (${n.tags.join(', ')})`).join('; ');
        
        const prompt = `
            Analyze this reading history of a web novel reader:
            ${historySummary}
            
            1. Generate a cool "Daoist Title" for them (e.g. "Venerable of the Dark System").
            2. Write a short 2-sentence psycho-analysis of their taste in novels (e.g. "You crave power fantasies...").
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        analysis: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    }).catch(() => ({ title: 'Errant Cultivator', analysis: 'Your path is unclear.' }));
}

export const generateChapterAudioAI = async (text: string): Promise<string | null> => {
  return runGenAI(async (ai) => {
    const cleanText = text.replace(/<[^>]*>/g, '').substring(0, 1000); 
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  }).catch(() => null);
};

export const generatePodcastAudioAI = async (text: string): Promise<string | null> => {
    return runGenAI(async (ai) => {
        // 1. Generate Script
        const scriptPrompt = `
            Convert the following story text into a lively podcast script between two enthusiastic hosts, Alex (Host) and Sam (Guest).
            They should discuss the plot points excitedly.
            Format constraints: STRICTLY "Alex: [text]" and "Sam: [text]".
            Keep it short, around 4 turns each.
            Text: ${text.substring(0, 1500)}
        `;

        const scriptResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: scriptPrompt
        });
        const script = scriptResponse.text || "";
        
        // 2. TTS
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: script }] }],
            config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Alex', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                            { speaker: 'Sam', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
                        ]
                    }
                }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    }).catch(() => null);
}

export const generateFateMapAI = async (novelTitle: string, description: string): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Generate a visual relationship graph for the novel "${novelTitle}".
            Description: ${description}.
            Create a clean, beautiful SVG code.
            - Nodes should be circles with character names.
            - Lines should connect nodes with relationship labels (e.g. "Rival", "Lover", "Master").
            - Use a dark theme (strokes white/gray, text white).
            - Make it look professional.
            - Return ONLY the SVG code, no markdown.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        let svg = response.text || "";
        // Clean markdown code blocks if present
        svg = svg.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '');
        return svg;
    }).catch(() => "");
}

export const generateSceneImageAI = async (text: string): Promise<string | null> => {
  if (!isModuleActive('imaging')) return null; // Quota Guard

  return runGenAI(async (ai) => {
      const cleanText = text.replace(/<[^>]*>/g, '').substring(0, 500);
      const prompt = `Generate a high quality, cinematic fantasy digital art illustration depicting this scene: ${cleanText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
      }
      return null;
  }).catch(() => null);
};

export const askChapterContextAI = async (context: string, question: string): Promise<string> => {
    if (!isModuleActive('chat')) return "Chat disabled to conserve neural resources.";

    return runGenAI(async (ai) => {
        const cleanContext = context.replace(/<[^>]*>/g, '').substring(0, 2000);
        const prompt = `Context: ${cleanContext}\n\nQuestion: ${question}\n\nAnswer briefly as an AI assistant helping a reader.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "I couldn't find an answer.";
    }).catch(() => "Error connecting to AI assistant.");
}

export const generateReviewsAI = async (novelTitle: string, novelDesc: string): Promise<Review[]> => {
  return runGenAI(async (ai) => {
      const model = "gemini-2.5-flash";
      const prompt = `
        Generate 3 distinct user reviews for a web novel titled "${novelTitle}".
        Description: "${novelDesc}".
        Return a JSON array.
        Each review should have: 
        - author (username)
        - rating (1-5, float allowed)
        - content (short text opinion)
        - date (relative, e.g., '2 days ago')
        Mix positive and constructive criticism.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                author: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                content: { type: Type.STRING },
                date: { type: Type.STRING },
                }
            }
            }
        }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((r: any, i: number) => ({
      id: `ai-rev-${Date.now()}-${i}`,
      author: r.author,
      avatarSeed: r.author,
      rating: r.rating,
      content: r.content,
      date: r.date,
      isUser: false
    }));
  }).catch(() => []);
};

export const generateStoryConceptAI = async (prompt: string): Promise<{title: string, description: string, tags: string[]} | null> => {
  return runGenAI(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a web novel concept based on this idea: "${prompt}". Return JSON with 'title', 'description', and 'tags'.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
            }
        }
    });
    return JSON.parse(response.text || "{}");
  }).catch(() => null);
};

export const generateCharacterAI = async (storyContext: string): Promise<Character | null> => {
  return runGenAI(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Create a unique character for a novel with this synopsis: "${storyContext}". Return JSON with 'name', 'role' (Protagonist/Antagonist/Support), 'description', and a 'visualPrompt' to describe them visually.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                description: { type: Type.STRING },
                visualPrompt: { type: Type.STRING }
            }
            }
        }
    });
    const data = JSON.parse(response.text || "{}");
    
    let avatarUrl = undefined;
    if (data.visualPrompt) {
         const imageBytes = await generateSceneImageAI(`Portrait of a character: ${data.visualPrompt}, digital art style, 8k`);
         if (imageBytes) {
             avatarUrl = `data:image/png;base64,${imageBytes}`;
         }
    }

    return {
        id: Date.now().toString(),
        name: data.name,
        role: data.role,
        description: data.description,
        avatarUrl
    };
  }).catch(() => null);
};

export const autoContinueStoryAI = async (context: string, currentContent: string): Promise<string> => {
    return runGenAI(async (ai) => {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Context: ${context}. \n\n Story so far: ${currentContent.slice(-1000)}. \n\n Continue writing the story (approx 200 words).`
        });
        return response.text || "";
    }).catch(() => "");
}

export const generateCritiqueAI = async (content: string): Promise<{pacing: string, dialogue: string, suggestions: string}> => {
  return runGenAI(async (ai) => {
      const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Critique the following story draft. Provide feedback on Pacing, Dialogue, and specific suggestions for improvement. Text: "${content.substring(0, 2000)}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        pacing: { type: Type.STRING },
                        dialogue: { type: Type.STRING },
                        suggestions: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
  }).catch(() => ({ pacing: 'Error', dialogue: 'Error', suggestions: 'Failed to generate critique.' }));
}

export const generateNovelTrailerAI = async (novelTitle: string, description: string): Promise<string | null> => {
  if (!isModuleActive('video')) return null;

  return runGenAI(async (ai) => {
      const prompt = `Cinematic movie trailer for a fantasy web novel titled "${novelTitle}". ${description.substring(0, 200)}. Epic, high resolution, 4k, trending on artstation.`;
      
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const downloadKey = getNextKey();
        return `${uri}&key=${downloadKey}`;
      }
      return null;
  }).catch(e => {
      console.error("Veo Error:", e);
      return null;
  });
};

export const generateDungeonStartAI = async (theme: string): Promise<DungeonState> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Start a text adventure roguelike game.
            Theme: ${theme}.
            Write a short prologue/Chapter 1 (approx 200 words).
            Provide 3 distinct choices for the player.
            Choices should carry risk.
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING },
                        choices: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['aggressive', 'stealth', 'diplomatic', 'risk'] }
                                }
                            }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        
        return {
            isActive: true,
            theme,
            chapterCount: 1,
            history: [data.content],
            currentContent: data.content,
            currentChoices: data.choices.map((c: any, i: number) => ({ id: i.toString(), text: c.text, type: c.type })),
            status: 'alive' as const,
            health: 100,
            inventory: []
        };
    }).catch(() => { throw new Error("Dungeon Start Failed"); });
};

export const generateDungeonTurnAI = async (state: DungeonState, choiceIndex: number): Promise<DungeonState> => {
    return runGenAI(async (ai) => {
        const choice = state.currentChoices[choiceIndex];
        const context = state.history.slice(-3).join('\n'); 

        const prompt = `
            Continue the text adventure.
            Theme: ${state.theme}.
            Previous Context: ${context}
            Player Action: ${choice.text} (${choice.type}).
            Current Health: ${state.health}.
            
            Write the next scene (approx 150 words).
            Determine if the player takes damage (0-100) based on risk.
            If damage >= current health, status is 'dead'.
            Provide 3 new choices if alive.
            
            Return JSON.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        content: { type: Type.STRING },
                        damageTaken: { type: Type.INTEGER },
                        isDead: { type: Type.BOOLEAN },
                        choices: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['aggressive', 'stealth', 'diplomatic', 'risk'] }
                                }
                            }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        const newHealth = Math.max(0, state.health - (data.damageTaken || 0));
        const isDead = data.isDead || newHealth <= 0;

        return {
            ...state,
            chapterCount: state.chapterCount + 1,
            history: [...state.history, `Action: ${choice.text}`, data.content],
            currentContent: data.content,
            currentChoices: isDead ? [] : data.choices.map((c: any, i: number) => ({ id: i.toString(), text: c.text, type: c.type })),
            status: (isDead ? 'dead' : 'alive') as 'alive' | 'dead' | 'victory',
            health: newHealth
        };
    }).catch(() => state); // Return old state on failure
};

export const generateCommentsAI = async (chapterContent: string): Promise<Comment[]> => {
    return runGenAI(async (ai) => {
        const prompt = `
            You are simulating a lively comment section for a web novel chapter.
            Story Content Summary: ${chapterContent.substring(0, 1000)}...
            
            Generate 5 distinct comments. 
            - Roleplay distinct webnovel reader archetypes (e.g., "The Hater", "The Theory Crafter", "The First Guy", "The Simp", "The Daoist").
            - Use internet slang appropriate for web novels (e.g. "courting death", "cliffhanger", "author pls").
            - Return JSON.
        `;

        const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                user: { type: Type.STRING },
                                content: { type: Type.STRING },
                                likes: { type: Type.INTEGER },
                                role: { type: Type.STRING, enum: ['Author', 'Top Fan', 'Sect Elder', 'Reader'] },
                                timeAgo: { type: Type.STRING }
                            }
                        }
                    }
                }
            });
            const data = JSON.parse(response.text || "[]");
            return data.map((c: any, i: number) => ({
                id: `cmt-${Date.now()}-${i}`,
                user: c.user,
                avatarSeed: c.user + i,
                content: c.content,
                likes: c.likes || Math.floor(Math.random() * 100),
                role: c.role === 'Reader' ? undefined : c.role,
                timeAgo: c.timeAgo || 'Just now'
            }));
    }).catch(() => []);
};

export const generateCrossoverAI = async (novel1: Novel, novel2: Novel): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Write a thrilling crossover chapter where the worlds of these two web novels merge.
            
            Novel A: "${novel1.title}" (${novel1.tags.join(', ')}). 
            Novel B: "${novel2.title}" (${novel2.tags.join(', ')}).
            
            Key Protagonists and concepts from both worlds should meet.
            Focus on the clash of power systems (e.g., Cultivation vs LitRPG System).
            Write approx 800 words. Format with HTML <p>.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "<p>The timelines refused to merge.</p>";
    }).catch(() => "<p>Convergence error.</p>");
};

export const parseNovelFromUrlAI = async (url: string): Promise<Novel | null> => {
  return runGenAI(async (ai) => {
    // Step 1: Use Google Search to find information about the novel URL
    const searchPrompt = `
        I need to find detailed information about a web novel located at this URL: "${url}"
        
        Please search for this novel. Find its:
        - Exact Title
        - Author Name
        - Description/Synopsis
        - Genres/Tags
        - Status (Ongoing/Completed)
        - Rating
        - Total Chapter Count
        - Title of the latest chapter
        - URL for a cover image
        
        Provide a comprehensive summary of these details in English.
    `;

    const searchResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: searchPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const searchResultText = searchResponse.text || "";
    
    // Step 2: Extract structured JSON data from the search result text
    const extractionPrompt = `
        Based on the following search results about a web novel:
        
        "${searchResultText}"
        
        Extract the data into a strict JSON object.
        - title (string)
        - author (string)
        - description (string)
        - tags (array of strings)
        - status (string: 'Ongoing' or 'Completed')
        - rating (number, 0-5)
        - totalChapters (number)
        - latestChapterTitle (string)
        - coverUrl (string)
        
        If details are missing, infer reasonable values or use 'Unknown'.
    `;

    const extractionResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: extractionPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    author: { type: Type.STRING },
                    description: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    status: { type: Type.STRING },
                    rating: { type: Type.NUMBER },
                    totalChapters: { type: Type.NUMBER },
                    latestChapterTitle: { type: Type.STRING },
                    coverUrl: { type: Type.STRING }
                }
            }
        }
    });
        
    const data = JSON.parse(extractionResponse.text || "{}");
    if (!data.title) return null;

    const chapters: Chapter[] = [];
    const count = data.totalChapters || 1;
    
    for(let i=1; i<=count; i++) {
        chapters.push({
            id: `imp-${Date.now()}-${i}`,
            title: i === count && data.latestChapterTitle ? data.latestChapterTitle : `Chapter ${i}`,
            number: i,
            releaseDate: 'Unknown'
        });
    }

    return {
        id: `imp-${Date.now()}`,
        title: data.title,
        author: data.author || 'Unknown',
        description: data.description || '',
        coverUrl: data.coverUrl || getRandomImage(100), // MOCK_DATA
        tags: data.tags || [],
        source: 'Web Search',
        rating: data.rating || 0,
        status: data.status || 'Ongoing',
        views: '0',
        lastUpdated: 'Just now',
        chapters: chapters,
        webUrl: url
    };

  }).catch(() => null);
};

export const generateLoreWikiAI = async (novelTitle: string, context: string): Promise<LoreEntry[]> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Analyze the following story context for the novel "${novelTitle}".
            Extract key lore elements into a structured wiki format.
            Categories: Character, Location, System, Item.
            
            Context: ${context.substring(0, 3000)}
            
            Return a JSON array of entries.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING, enum: ['Character', 'Location', 'System', 'Item'] },
                            name: { type: Type.STRING },
                            description: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        return JSON.parse(response.text || "[]");
    }).catch(() => []);
};

export const generateParagraphReactionAI = async (paragraph: string, context: string): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            You are a witty web novel reader leaving a comment on a specific paragraph.
            Paragraph: "${paragraph}"
            Story Context: ${context.substring(0, 500)}...
            
            Write a short, engaging reaction (max 1 sentence). 
            Can be funny, shocked, or insightful.
            Do not use hashtags.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text?.trim() || "Interesting...";
    }).catch(() => "Interesting...");
};

// --- NEW TRANSLATOR FUNCTION ---
export const translateRawTextAI = async (rawText: string, mode: 'literal' | 'localized' = 'localized'): Promise<string> => {
    return runGenAI(async (ai) => {
        const prompt = `
            Translate the following raw web novel text into English.
            Mode: ${mode === 'localized' ? 'High quality localization, smooth prose, adapting idioms.' : 'Literal translation, preserving original structure.'}
            
            Source Text:
            ${rawText.substring(0, 2000)}
            
            Output ONLY the English translation.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text || "Translation failed.";
    }).catch(() => "Translation error. Check connection or quota.");
};
