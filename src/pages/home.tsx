import { A } from "@solidjs/router";

export default function Home() {
	return (
		<section class="bg-gradient-to-b from-blue-50 to-white min-h-screen">
			<div class="max-w-4xl mx-auto px-8 py-16">
				<div class="text-center mb-12">
					<h1 class="text-5xl font-bold text-gray-900 mb-4">Scripture Tag</h1>
					<p class="text-xl text-gray-600">A word-level scripture tagging and annotation system</p>
				</div>

				<div class="bg-white rounded-lg shadow-lg p-8 mb-8">
					<h2 class="text-2xl font-semibold text-gray-800 mb-4">What is Scripture Tag?</h2>
					<p class="text-gray-700 leading-relaxed mb-4">
						Scripture Tag is a powerful tool for deep scripture study. Tag individual words or
						groups of words with custom tags, apply multiple tags to the same passage
						(N-cardinality), and filter your study by specific themes or topics. Whether you're
						tracking doctrinal themes, studying Hebrew poetry, or organizing personal insights,
						Scripture Tag gives you word-level precision with complete flexibility.
					</p>
				</div>

				<div class="grid md:grid-cols-2 gap-6 mb-8">
					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-xl font-semibold text-gray-800 mb-3">✨ Key Features</h3>
						<ul class="space-y-2 text-gray-700">
							<li>
								• <strong>Granular Word-Level Tagging</strong> - Tag individual words with precision
							</li>
							<li>
								• <strong>Multiple Tags Per Word</strong> - Apply as many tags as you need
							</li>
							<li>
								• <strong>Flexible Filtering</strong> - Show/hide tags with boolean logic
							</li>
							<li>
								• <strong>Custom Presentation</strong> - Define colors, styles, and icons
							</li>
							<li>
								• <strong>Multiple Translations</strong> - Book of Mormon, KJV Bible, and more
							</li>
						</ul>
					</div>

					<div class="bg-white rounded-lg shadow p-6">
						<h3 class="text-xl font-semibold text-gray-800 mb-3">🔒 Privacy & Control</h3>
						<ul class="space-y-2 text-gray-700">
							<li>
								• <strong>Offline-First</strong> - Works entirely in your browser
							</li>
							<li>
								• <strong>Privacy-Focused</strong> - All data stays on your device
							</li>
							<li>
								• <strong>Git-Based Sync</strong> - Version control for annotations
							</li>
							<li>
								• <strong>Collaboration</strong> - Share via git repository
							</li>
							<li>
								• <strong>Export/Import</strong> - Backup as JSON files
							</li>
						</ul>
					</div>
				</div>

				<div class="bg-blue-100 rounded-lg p-8 mb-8">
					<h3 class="text-xl font-semibold text-gray-800 mb-3">📖 Supported Scriptures</h3>
					<div class="text-gray-700 space-y-2">
						<p>
							✅ <strong>The Book of Mormon</strong> - All 15 books
						</p>
						<p>
							✅ <strong>The Holy Bible (KJV)</strong> - Old and New Testament
						</p>
						<p>
							🔜 <strong>The Doctrine and Covenants</strong> - Coming soon
						</p>
						<p>
							🔜 <strong>The Pearl of Great Price</strong> - Coming soon
						</p>
					</div>
				</div>

				<div class="text-center">
					<A
						href="/scripture"
						class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-colors"
					>
						Start Reading Scripture →
					</A>
				</div>

				<div class="mt-12 text-center text-sm text-gray-500">
					<p>
						Fast & responsive with fine-grained reactivity. Built with SolidJS, Effect-TS, and
						TailwindCSS.
					</p>
				</div>
			</div>
		</section>
	);
}
