<script lang="ts">
	import { siteConfig } from '$lib/stores';

	// This logging statement will provide the raw payload received from the storeManager()	
//	$: {
//		console.log('Raw siteConfig:', JSON.stringify($siteConfig, null, 2));
//	}

    let status = 'submit ->';
	const handleSubmit = async (data: SubmitEvent) => {
		status = 'submitting...';
		const formData = new FormData(data.currentTarget as HTMLFormElement);
		const object = Object.fromEntries(formData);
		object.access_key = $siteConfig.web3forms_key;
		const json = JSON.stringify(object);

		const response = await fetch('https://api.web3forms.com/submit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: json
		});

		const result = await response.json();
		if (result.success) {
			status = 'message sent!';
		}
	};

	// Reactive statement to track contact methods visibility
	$: contactMethods = {
		discord: Boolean($siteConfig?.show_discord) && $siteConfig?.contact_discord_url,
		email: Boolean($siteConfig?.show_email) && $siteConfig?.contact_email,
		instagram: Boolean($siteConfig?.show_instagram) && $siteConfig?.contact_instagram_url
	};
</script>

<main>
	<h1>contact</h1>
	{#if $siteConfig.contact_description}
		<p>{$siteConfig.contact_description}</p>
	{/if}

	{#if contactMethods.discord}
		<div class="info">
			discord <span class="sub">-></span>
			<a href={$siteConfig.contact_discord_url} class="external">
				{$siteConfig.contact_discord_handle}<span class="arrow">/></span>
			</a>
		</div>
	{/if}

	{#if contactMethods.email}
		<div class="info">
			email <span class="sub">-></span>
			<a href="mailto:{$siteConfig.contact_email}" class="external">
				{$siteConfig.contact_email}<span class="arrow">/></span>
			</a>
		</div>
	{/if}

	{#if contactMethods.instagram}
		<div class="info">
			instagram <span class="sub">-></span>
			<a href={$siteConfig.contact_instagram_url} class="external">
				{$siteConfig.contact_instagram_handle}<span class="arrow">/></span>
			</a>
		</div>
	{/if}

	<br />
	<br />
	<br />
	<h3>contact form</h3>
	<form on:submit|preventDefault={handleSubmit}>
		<input type="text" name="name" placeholder="name" required />
		<input type="email" name="email" placeholder="email" required />
		<textarea name="message" placeholder="your message..." required rows="4"></textarea>
		<button type="submit">{status}</button>
	</form>
</main>

<style lang="scss">
	main {
		width: 100%;
		max-width: 53rem;
		margin: 0 auto 10rem auto;
		padding: 1.5rem;
	}

	h1 {
		margin-bottom: 2rem;
	}

	a {
		font-family: 'Space Mono', monospace;
		font-size: 1.2rem;
	}

	.info {
		font-size: 1.2rem;
		margin: 0.5rem 0;
		font-family: 'Space Mono', monospace;
	}

	form {
		display: grid;
		grid-template-columns: auto auto;
		gap: 1rem;
	}

	input[type='text'],
	input[type='email'],
	textarea,
	button {
		background-color: transparent;
		border: none;
		padding: 1rem;
		color: inherit;
		font: inherit;
		font-size: 1.1rem;
		border: 2px solid var(--bg-3);
		transition: 0.2s;
		background-color: var(--bg-2);
		// border-radius: 0.5rem;

		&:focus {
			outline: none;
			border: 2px solid var(--txt-2);
		}
	}

	::placeholder {
		color: var(--txt-2);
	}

	textarea,
	button {
		grid-column: 1 / -1;
	}

	button {
		font-family: 'Space Mono', monospace;
		padding: 1rem 1.2rem;
		&:hover {
			border: 2px solid var(--txt-2);
		}
	}

	@media (max-width: 600px) {
		form {
			grid-template-columns: auto;
		}
	}
</style>
